const test = require("node:test");
const assert = require("node:assert/strict");

const { createCourse, getInstructorStats } = require("../src/controllers/courses.controller");
const { prisma } = require("../src/config/db");

test("createCourse - duplicate title validation", async (t) => {
  await t.test(
    "returns 409 when an active course with the same title exists",
    async () => {
      const originalFindFirst = prisma.course.findFirst;
      const originalCreate = prisma.course.create;

      prisma.course.findFirst = async () => ({
        id: "course-1",
        title: "Java Programming",
        isDeleted: false,
      });

      let createCalled = false;

      prisma.course.create = async () => {
        createCalled = true;
      };

      const req = {
        user: {
          id: "admin-1",
          name: "Test Admin",
          role: "admin",
        },
        body: {
          title: "Java Programming",
          description: "Learn Java",
          category: "Programming",
          level: "Beginner",
        },
      };

      const res = {
        statusCode: null,
        body: null,

        status(code) {
          this.statusCode = code;
          return this;
        },

        json(data) {
          this.body = data;
          return this;
        },
      };

      let nextCalled = false;

      const next = () => {
        nextCalled = true;
      };

      try {
        await createCourse(req, res, next);

        assert.equal(res.statusCode, 409);

        assert.deepEqual(res.body, {
          success: false,
          error: "A course with this title already exists.",
        });

        assert.equal(createCalled, false);
        assert.equal(nextCalled, false);
      } finally {
        prisma.course.findFirst = originalFindFirst;
        prisma.course.create = originalCreate;
      }
    },
  );

  await t.test("returns 409 when the title differs only by case", async () => {
    const originalFindFirst = prisma.course.findFirst;
    const originalCreate = prisma.course.create;

    prisma.course.findFirst = async () => ({
      id: "course-1",
      title: "Java Programming",
      isDeleted: false,
    });

    let createCalled = false;

    prisma.course.create = async () => {
      createCalled = true;
    };

    const req = {
      user: {
        id: "admin-1",
        name: "Test Admin",
        role: "admin",
      },
      body: {
        title: "java programming",
        description: "Learn Java",
        category: "Programming",
        level: "Beginner",
      },
    };

    const res = {
      statusCode: null,
      body: null,

      status(code) {
        this.statusCode = code;
        return this;
      },

      json(data) {
        this.body = data;
        return this;
      },
    };

    let nextCalled = false;

    const next = () => {
      nextCalled = true;
    };

    try {
      await createCourse(req, res, next);

      assert.equal(res.statusCode, 409);

      assert.deepEqual(res.body, {
        success: false,
        error: "A course with this title already exists.",
      });

      assert.equal(createCalled, false);
      assert.equal(nextCalled, false);
    } finally {
      prisma.course.findFirst = originalFindFirst;
      prisma.course.create = originalCreate;
    }
  });

  await t.test(
    "allows a new course when no active course with the title exists",
    async () => {
      const originalFindFirst = prisma.course.findFirst;
      const originalCreate = prisma.course.create;
      const originalCategoryFindUnique = prisma.category.findUnique;
      const originalCourseActivityCreate = prisma.courseActivity.create;

      prisma.course.findFirst = async () => null;

      prisma.category.findUnique = async () => ({
        id: "category-1",
        name: "Programming",
      });

      prisma.course.create = async () => ({
        id: "course-2",
        title: "Java Programming",
        description: "Learn Java",
        category: "Programming",
        level: "Beginner",
      });

      prisma.courseActivity.create = async () => ({});

      const req = {
        user: {
          id: "admin-1",
          name: "Test Admin",
          role: "admin",
        },
        body: {
          title: "Java Programming",
          description: "Learn Java",
          category: "Programming",
          level: "Beginner",
        },
      };

      const res = {
        statusCode: null,
        body: null,

        status(code) {
          this.statusCode = code;
          return this;
        },

        json(data) {
          this.body = data;
          return this;
        },
      };

      let nextCalled = false;

      const next = () => {
        nextCalled = true;
      };

      try {
        await createCourse(req, res, next);

        assert.equal(res.statusCode, 201);

        assert.equal(res.body.success, true);

        assert.equal(res.body.data.id, "course-2");

        assert.equal(res.body.data.title, "Java Programming");

        assert.equal(nextCalled, false);
      } finally {
        prisma.course.findFirst = originalFindFirst;
        prisma.course.create = originalCreate;
        prisma.category.findUnique = originalCategoryFindUnique;
        prisma.courseActivity.create = originalCourseActivityCreate;
      }
    },
  );
});

test("getInstructorStats - instructor analytics and metrics", async (t) => {
  const mockRes = () => {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    return res;
  };

  await t.test(
    "returns zero state metrics when instructor has no active courses",
    async () => {
      const originalCourseFindMany = prisma.course.findMany;
      prisma.course.findMany = async () => [];

      const req = { user: { id: "instructor-1" } };
      const res = mockRes();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      try {
        await getInstructorStats(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, {
          success: true,
          data: {
            totalCourses: 0,
            totalEnrollments: 0,
            completionRate: 0,
            averageCourseRating: 0,
            recentActivity: [],
          },
        });
        assert.equal(nextCalled, false);
      } finally {
        prisma.course.findMany = originalCourseFindMany;
      }
    },
  );

  await t.test(
    "calculates multi-course aggregated math correctly",
    async () => {
      const originalCourseFindMany = prisma.course.findMany;
      const originalEnrollmentCount = prisma.enrollment.count;
      const originalReviewAggregate = prisma.review.aggregate;
      const originalActivityFindMany = prisma.courseActivity.findMany;

      prisma.course.findMany = async () => [
        { id: "c-1" },
        { id: "c-2" },
      ];

      let countCall = 0;
      prisma.enrollment.count = async () => {
        countCall++;
        if (countCall === 1) return 15; // total enrollments
        if (countCall === 2) return 6;  // completed enrollments
        return 0;
      };

      prisma.review.aggregate = async () => ({
        _avg: { rating: 4.66666 },
      });

      const mockActivities = [
        {
          id: "act-1",
          action: "created",
          details: "Course created",
          userId: "u-1",
          userName: "Instructor Bob",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          course: { id: "c-1", title: "Course 1" },
        },
      ];
      prisma.courseActivity.findMany = async () => mockActivities;

      const req = { user: { id: "instructor-1" } };
      const res = mockRes();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      try {
        await getInstructorStats(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.totalCourses, 2);
        assert.equal(res.body.data.totalEnrollments, 15);
        assert.equal(res.body.data.completionRate, 40); // (6/15)*100 = 40
        assert.equal(res.body.data.averageCourseRating, 4.67); // 4.66666 rounded to 2 decimals
        assert.deepEqual(res.body.data.recentActivity, mockActivities);
        assert.equal(nextCalled, false);
      } finally {
        prisma.course.findMany = originalCourseFindMany;
        prisma.enrollment.count = originalEnrollmentCount;
        prisma.review.aggregate = originalReviewAggregate;
        prisma.courseActivity.findMany = originalActivityFindMany;
      }
    },
  );

  await t.test(
    "handles zero enrollments and null rating safely without divide-by-zero errors",
    async () => {
      const originalCourseFindMany = prisma.course.findMany;
      const originalEnrollmentCount = prisma.enrollment.count;
      const originalReviewAggregate = prisma.review.aggregate;
      const originalActivityFindMany = prisma.courseActivity.findMany;

      prisma.course.findMany = async () => [{ id: "c-1" }];
      prisma.enrollment.count = async () => 0;
      prisma.review.aggregate = async () => ({ _avg: { rating: null } });
      prisma.courseActivity.findMany = async () => [];

      const req = { user: { id: "instructor-1" } };
      const res = mockRes();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      try {
        await getInstructorStats(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.totalCourses, 1);
        assert.equal(res.body.data.totalEnrollments, 0);
        assert.equal(res.body.data.completionRate, 0);
        assert.equal(res.body.data.averageCourseRating, 0);
        assert.deepEqual(res.body.data.recentActivity, []);
        assert.equal(nextCalled, false);
      } finally {
        prisma.course.findMany = originalCourseFindMany;
        prisma.enrollment.count = originalEnrollmentCount;
        prisma.review.aggregate = originalReviewAggregate;
        prisma.courseActivity.findMany = originalActivityFindMany;
      }
    },
  );

  await t.test("forwards database errors to next() error handler", async () => {
    const originalCourseFindMany = prisma.course.findMany;
    const dbError = new Error("Database connection failed");
    prisma.course.findMany = async () => {
      throw dbError;
    };

    const req = { user: { id: "instructor-1" } };
    const res = mockRes();
    let passedError = null;
    const next = (err) => {
      passedError = err;
    };

    try {
      await getInstructorStats(req, res, next);

      assert.equal(passedError, dbError);
    } finally {
      prisma.course.findMany = originalCourseFindMany;
    }
  });
});

