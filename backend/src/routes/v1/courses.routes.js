const express = require("express");


const {
  getCourses,
  getTrendingCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  restoreCourse,
  addLesson,
  deleteLesson,
  getInstructorStats,
  getLearningPaths,
  generateLessonsAI,
  completeLesson,
} = require("../../controllers/courses.controller");


const { protect, authorize } = require("../../middlewares/auth.middleware");


const { validate } = require("../../middlewares/validate.middleware");


const {
  courseSchema,
  lessonSchema,
} = require("../../validations/course.validation");


const { cacheMiddleware } = require("../../middlewares/cache.middleware");


const router = express.Router();


// ===============================
// Courses
// ===============================


router
  .route("/")


  // Get all approved non-deleted courses
  .get(cacheMiddleware(300), getCourses)


  // Create course (Admin only)
  .post(protect, authorize("admin"), validate(courseSchema), createCourse);


// ===============================
// Learning Paths
// ===============================


//route trending courses
router.route("/trending").get(getTrendingCourses);


router
  .route("/learning-paths")


  .get(getLearningPaths);


// ===============================
// Instructor Statistics
// ===============================


/**
 * @swagger
 * /courses/instructor/stats:
 *   get:
 *     summary: Retrieve instructor performance statistics
 *     description: Returns aggregated metrics for the authenticated instructor including total courses, total enrollments, completion rate, average approved review rating, and recent course activity.
 *     tags:
 *       - Courses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instructor statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCourses:
 *                       type: integer
 *                       example: 5
 *                     totalEnrollments:
 *                       type: integer
 *                       example: 120
 *                     completionRate:
 *                       type: number
 *                       example: 45.5
 *                     averageCourseRating:
 *                       type: number
 *                       example: 4.8
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: act-101
 *                           action:
 *                             type: string
 *                             example: created
 *                           details:
 *                             type: string
 *                             example: Course created and initialized.
 *                           userId:
 *                             type: string
 *                             example: usr-1
 *                           userName:
 *                             type: string
 *                             example: Instructor Name
 *                           createdAt:
 *                             type: string
 *                             example: "2026-08-16T12:00:00.000Z"
 *                           course:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: crs-1
 *                               title:
 *                                 type: string
 *                                 example: Web Development 101
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Requires Instructor or Admin role.
 *       500:
 *         description: Internal Server Error
 */
router
  .route("/instructor/stats")


  .get(protect, authorize("instructor", "admin"), getInstructorStats);


// ===============================
// Single Course
// ===============================


// router
//   .route("/instructor/course-analytics")
//   .get(protect, authorize("admin"), getInstructorCourseAnalytics);


router
  .route("/:id")


  .get(getCourse)


  .put(protect, authorize("admin"), updateCourse)


  // Soft delete course
  .delete(protect, authorize("admin"), deleteCourse);


// ===============================
// Restore Deleted Course
// ===============================


router
  .route("/:id/restore")


  .patch(protect, authorize("admin"), restoreCourse);


// ===============================
// Lessons
// ===============================


// router.route("/:id/timeline").get(protect, getCourseTimeline);


router
  .route("/:courseId/lessons")


  .post(protect, authorize("admin"), validate(lessonSchema), addLesson);


// ===============================
// Generate AI Lessons
// ===============================


router
  .route("/:courseId/generate-lessons")


  .post(protect, authorize("admin"), generateLessonsAI);


// ===============================
// Delete Lesson
// ===============================


router
  .route("/:courseId/lessons/:lessonId")


  .delete(protect, authorize("admin"), deleteLesson);


// ===============================
// Complete Lesson
// ===============================


router
  .route("/:courseId/lessons/:lessonId/complete")


  .post(protect, completeLesson);


module.exports = router; 