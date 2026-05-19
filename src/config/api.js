import appSettings from './appSettings';

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || appSettings.api.baseUrl,
  BASE_URL_Local: process.env.REACT_APP_BASE_URL_LOCAL || appSettings.api.baseUrlLocal,
  CHATBOT_URL: appSettings.api.chatbotUrl,
  TIMEOUT: appSettings.api.timeout,
  RETRY_ATTEMPTS: appSettings.api.retryAttempts,
};

// API Endpoints
export const ENDPOINTS = {
  COURSES: '/courses',
  COURSE_CREATE: '/courses/CreateCourse',
  COURSE_UPLOAD_CSV: '/courses/upload-csv',
  COURSE_REMOVE_THUMBNAIL: (id) => `/remove-thumbnail?courseId=${id}`,
  TEMPLATES: '/templates',
  TEMPLATES_TYPES: '/templates/types',
  TEMPLATE_BY_ID: (id) => `/templates/${id}`,
  TEMPLATE_CREATE: '/templates',
  TEMPLATE_UPDATE: (id) => `/templates/${id}`,
  TEMPLATE_DELETE: (id) => `/templates/${id}`,
  COURSE_UPLOAD_CSV_By_Name: '/courses/upload-csv-by-name',
  COURSES_PAGINATED: '/coursedata/paginated',
  COURSE_HIERARCHY: '/CourseData/hierarchy',
  COURSE_BY_ID: (id) => `/courses/${id}`,
  COURSE_AI_CONTENT: '/CourseData/hierarchy',
  MEDIA_AUDIO_BY_ID: (id) => `/media/audio/${id}`,
  MEDIA_IMAGE_BY_ID: (id) => `/media/image/${id}`,
 // Admin Routes and Authentication
  ADMINCOURSE:'/courses',
  ROUTES: '/admin/routes',
  ROLES: '/admin/roles',
  AUTH_LOGIN: '/auth/login',
  AUTH_CHANGE_PASSWORD: '/auth/change-password',
  AUTH_USER: '/auth/me',
    COURSES_ADMIN: '/courses',
  COURSE_BY_ID_ADMIN: (id) => `/courses/${id}`,
  COURSE_TAGS: '/admin/courses/tags',
  COURSE_BADGES: '/admin/courses/badges',
  COURSE_FEATURED: '/admin/courses/featured',
  COURSE_STATUS: '/admin/courses/status',
  CATEGORIES_Admin: '/categories',
  COURSE_TYPES: '/courses/types',
  COURSE_LEVELS: '/courses/levels',
  SUBCATEGORIES: '/Subcategories',
  COURSE_BADGES_DROPDOWN: '/courses/badges',
  CAREER_PATHS: '/career-paths',
  // Course Badge Management endpoints
  COURSE_BADGE_ALL: '/Badges',
  COURSE_BADGE_BY_ID: (id) => `/Badges/${id}`,
  COURSE_BADGE_UPDATE: (id) => `/Badges/${id}`,
  COURSE_BADGE_CREATE: '/Badges',
  COURSE_BADGE_DELETE: (id) => `/Badges/${id}`,
  CAREER_ROLES: '/career-roles',
  CAREER_ROLE_BY_ID: (id) => `/career-roles/${id}`,
  CAREER_ROLE_CREATE: '/career-roles',
  CAREER_ROLE_UPDATE: (id) => `/career-roles/${id}`,
  CAREER_ROLE_DELETE: (id) => `/career-roles/${id}`,
  CAREER_SKILLS: '/careerskills',
  CAREER_SKILL_BY_ID: (id) => `/careerskills/${id}`,
  CAREER_SKILL_CREATE: '/careerskills',
  CAREER_SKILL_UPDATE: (id) => `/careerskills/${id}`,
  CAREER_SKILL_DELETE: (id) => `/careerskills/${id}`,
  CAREER_PATH_LEVELS: '/career-paths/levels',
  ALL_SKILLS: '/skills',
  // Topic endpoints
  TOPICS_ALL: '/Topic',
  TOPIC_BY_ID: (id) => `/Topic/${id}`,
  TOPIC_CREATE: '/Topic',
  TOPIC_UPDATE: (id) => `/Topic/${id}`,
  TOPIC_DELETE: (id) => `/Topic/${id}`,
  // Topic Mapping endpoints
  TOPIC_MAPPING_GET: (topicId, type) => `/TopicMapping/${topicId}/${type}`,
  TOPIC_MAPPING_ASSIGN: '/TopicMapping/Assign',
  COURSES_BY_TYPE: (typeId) => `/admin/courses?CourseTypeId=${typeId}`,
  CAREER_SKILLS_ENDPOINT: '/careerskills', // Added career skills endpoint
  // Course Skill Mapping endpoints
  COURSE_SKILL_MAP_ALL: '/CourseSkillMap/all',
  COURSE_SKILL_MAP_BY_ID: (id) => `/CourseSkillMap/skill/${id}`,
  COURSE_SKILL_MAP_SYNC: '/CourseSkillMap/sync',
  // Skills endpoint (updated to correct API)
  SKILLS_ALL: '/careerskills',
  // Skill Mapping endpoints (similar to badge assignment)
  SKILL_MAPPING_ASSIGN: '/SkillMapping/assign',
  SKILL_MAPPING_GET: (skillId, type) => `/SkillMapping/${skillId}/${type ? `${type}` : ''}`,

  // LMS Lectures endpoints
  LMS_LECTURES_SEARCH: '/courses/lms-lectures/search',
  // Reviews endpoints
  CAREER_PATH_REVIEWS: (id) => `/Review/careerpath/${id}`,
  COURSE_REVIEWS: (id) => `/Review/course/${id}`,
  CAREER_PATH_REVIEW_CREATE: '/Review',
  CAREER_PATH_REVIEW_UPDATE: (id) => `/Review/${id}`,
  CAREER_PATH_REVIEW_DELETE: (id) => `/Review/${id}`,
  COURSE_REVIEW_CREATE: '/Review',
  COURSE_REVIEW_UPDATE: (id) => `/Review/${id}`,
  COURSE_REVIEW_DELETE: (id) => `/Review/${id}`,
  CAREER_PATH_REVIEW_READ: (id) => `/Review/${id}`,
  COURSE_REVIEW_READ: (id) => `/Review/${id}`,
  CAREER_PATH_REVIEW_ALL: '/Review/careerpath',
  COURSE_REVIEW_ALL: '/Review/course',
  
  // Review Management endpoints
  REVIEWS_ALL: '/reviews',
  REVIEW_BY_ID: (id) => `/reviews/${id}`,
  REVIEW_UPDATE_STATUS: (id) => `/reviews/${id}/status`,
  REVIEW_RESPOND: (id) => `/reviews/${id}/respond`,
  REVIEW_DELETE: (id) => `/reviews/${id}`,
  REVIEW_MARK_HELPFUL: (id) => `/reviews/${id}/helpful`,

  // Review dropdown endpoints
  REVIEW_CAREER_PATHS_DROPDOWN: '/Review/careerpaths/dropdown',
  REVIEW_COURSES_DROPDOWN: '/Review/courses/dropdown',
  REVIEW_CAREER_PATH_LEVELS: (careerPathId) => `/Review/careerpaths/${careerPathId}/levels`,
  REVIEW_WITH_DETAILS: (reviewId) => `/Review/${reviewId}/details`,
  REVIEW_UPLOAD_CSV: '/Review/upload-excel',

  // Discount Rates endpoints
  DISCOUNT_RATES: '/DiscountRates',
  DISCOUNT_RATES_CREATE: '/DiscountRates',
  DISCOUNT_RATES_BY_ID: (id) => `/DiscountRates/${id}`,
  DISCOUNT_RATES_UPDATE: (id) => `/DiscountRates/${id}`,
  DISCOUNT_RATES_DELETE: (id) => `/DiscountRates/${id}`,
  DISCOUNT_RATES_TYPES_DROPDOWN: '/DiscountRates/dropdown/types',
  DISCOUNT_RATES_ASSIGN: '/DiscountRates/assign-course',
  DISCOUNT_RATES_ASSIGN_COURSE_TYPE: '/DiscountRates/assign-course-type',
  DISCOUNT_RATES_ASSIGN_CAREER_PATH: '/DiscountRates/Assign-CareerPath',
  
  // Discount Rate Mapping endpoints
  DISCOUNT_RATES_MAPPINGS: '/DiscountRates/mappings',
  DISCOUNT_RATES_MAPPINGS_BY_COURSE: (courseId) => `/DiscountRates/mappings/course/${courseId}`,
  DISCOUNT_RATES_MAPPINGS_BY_ID: (id) => `/DiscountRates/mappings/${id}`,
  DISCOUNT_RATES_MAPPINGS_UPDATE: (id) => `/DiscountRates/mappings/${id}`,
  DISCOUNT_RATES_MAPPINGS_DELETE: (id) => `/DiscountRates/mappings/${id}`,

  // Slug Management endpoints
  SLUG_MANAGEMENT: {
    UPDATE_ALL_COURSE_SLUGS: '/SlugManagment/update-all-course-slugs',
    UPDATE_COURSE_SLUG: '/SlugManagment/update-course-slug',
    GET_SLUG_BY_COURSE_ID: (courseId) => `/SlugManagment/getSlugByCourseId/${courseId}`,
    UPDATE_ALL_CAREER_PATH_SLUGS: '/SlugManagment/Update-All-CareerPath-Slugs',
    UPDATE_CAREER_PATH_SLUG: '/SlugManagment/Update-CareerPath-Slug',
    GET_SLUG_BY_CAREER_PATH_ID: (careerPathId) => `/SlugManagment/getSlugByCareerPathId/${careerPathId}`,
  },
  
  // Student Management endpoints
  STUDENT_MANAGEMENT_ALL: '/StudentManagement',
  STUDENT_MANAGEMENT_BY_ID: (id) => `/StudentManagement/${id}`,
  STUDENT_MANAGEMENT_DROPDOWN_GENDERS: '/StudentManagement/dropdown/genders',
  STUDENT_MANAGEMENT_DROPDOWN_SIGNUP_TYPES: '/StudentManagement/dropdown/signup-types',
  STUDENT_MANAGEMENT_DROPDOWN_QUALIFICATIONS: '/StudentManagement/dropdown/qualifications',
  STUDENT_MANAGEMENT_DROPDOWN_COUNTRIES: '/StudentManagement/dropdown/countries',
  STUDENT_MANAGEMENT_GENERATE_DASHBOARD_URL: '/StudentManagement/generate-dashboard-url',
  STUDENT_MANAGEMENT_CART: (customerId) => `/StudentManagement/${customerId}/cart`,
  STUDENT_MANAGEMENT_TESTIMONIALS: (customerId) => `/StudentManagement/testimonials?customerId=${customerId}`,
  STUDENT_MANAGEMENT_TESTIMONIALS_APPROVE: 'https://api.classpedia.ai/api/Rewards/ApproveTestimonial',
  STUDENT_MANAGEMENT_TESTIMONIAL_STATUSES: '/StudentManagement/dropdown/testimonial-statuses',
  STUDENT_ORDER_ALL: '/StudentOrder',
  STUDENT_ORDER_BY_ID: (id) => `/StudentOrder/${id}`,
  STUDENT_ORDER_PAYMENT_STATUSES: '/StudentOrder/dropdown/order-statuses',
  PAYMENT_METHOD: '/PaymentMethod',
  // Course Lecture Content endpoints
  COURSE_LECTURE_CONTENT: (lectureId) => `/courses/lecture-content/${lectureId}`,
  COURSE_GENERATE_CONTENT: '/courses/generate-content',

  // Payment Provider endpoints
  PAYMENT_PROVIDERS: '/payment-providers',
  PAYMENT_PROVIDER_BY_ID: (id) => `/payment-providers/${id}`,

  // Payment Provider Account endpoints
  PAYMENT_PROVIDER_ACCOUNTS: '/payment-provider-accounts',
  PAYMENT_PROVIDER_ACCOUNT_BY_ID: (id) => `/payment-provider-accounts/${id}`,

  // Contact Information endpoints
  CONTACT_INFORMATION: '/contact-information',
  INQUIRY_OPTIONS: '/inquiry-options',

  // Email endpoints
  EMAIL_LIST: '/Email',
  EMAIL_BY_ID: (id) => `/Email/${id}`,
  EMAIL_MARK_AS_READ: (id) => `/Email/${id}/mark-as-read`,
  EMAIL_MARK_READ: '/Email/mark-read',
  EMAIL_MARK_UNREAD: '/Email/mark-unread',
  EMAIL_TOGGLE_STAR: '/Email/toggle-star',
  EMAIL_DELETE: '/Email/delete',
  EMAIL_ARCHIVE: '/Email/archive',
  EMAIL_MOVE_TO_SPAM: '/Email/move-to-spam',
  EMAIL_SEND: '/Email/send',
  EMAIL_SAVE_DRAFT: '/Email/save-draft',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};