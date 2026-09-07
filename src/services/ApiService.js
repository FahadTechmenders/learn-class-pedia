import { API_CONFIG, ENDPOINTS } from '../config/api';
import { isProduction } from '../config/appSettings';
import { checkTokenBeforeRequest } from '../utils/authDebug';
import routesData from '../data/routes.json';

class ApiService {
  constructor() {
    this.baseURL = isProduction() ? API_CONFIG.BASE_URL : API_CONFIG.BASE_URL_Local;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  async request(endpoint, options = {}) {
    // Check token before making request
    try {
      checkTokenBeforeRequest();
    } catch (error) {
      // Token is missing or expired
      console.error('Authentication error:', error.message);
      // Redirect to login or handle auth error
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw error;
    }
    
    // Check if endpoint is already a full URL (starts with http:// or https://)
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://') 
      ? endpoint 
      : `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        ...options.headers,
      },
      timeout: this.timeout,
      ...options,
    };

    // Only set Content-Type to application/json if not already set and not FormData
    if (!config.headers['Content-Type'] && !(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    // Remove Authorization header if explicitly set to null/undefined (for login)
    if (options.headers && (options.headers.Authorization === null || options.headers.Authorization === undefined)) {
      delete config.headers.Authorization;
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Handle 401 specifically
        if (response.status === 401) {
          console.error(' 401 Unauthorized - Token may be invalid or expired');
          // Clear token and redirect to login
          localStorage.removeItem('adminToken');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }

        // Try to get error details from response body
        let errorDetails = '';
        try {
          // Check if response has content before parsing JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            // Handle different error response formats - prioritize "message" field
            errorDetails = errorData.message || errorData.error || errorData.title || 
                          (errorData.errors && Object.values(errorData.errors)[0]?.[0]) ||
                          JSON.stringify(errorData);
          } else {
            // If not JSON, try to get text content
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          // If parsing fails, use status text
          errorDetails = response.statusText || 'Unknown error';
        }
        
        // Create error with response data attached
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      // Handle successful response - check if it has content before parsing JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        // For successful responses without JSON content, return a success indicator
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error(`Admin API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Category Management methods
  
  // GET all categories with pagination and filters
  async getAllCategories(page = null, pageSize = null, queryParams = '') {
    let url = ENDPOINTS.CATEGORIES_Admin;

    // Build query parameters
    const params = new URLSearchParams();
    
    // Add pagination params if provided
    if (page !== null && pageSize !== null) {
      params.append('page', page);
      params.append('pageSize', pageSize);
    }
    
    // Add other query params if provided
    if (queryParams) {
      const queryParamsObj = new URLSearchParams(queryParams);
      for (const [key, value] of queryParamsObj) {
        params.append(key, value);
      }
    }
    
    // Add params to URL if any exist
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.request(url);
  }
  // GET category by ID
  async getCategoryById(id) {
    return this.request(`${ENDPOINTS.CATEGORIES_Admin}/${id}`);
  }

  // POST create new category
  async createCategory(categoryData) {
    // Always use FormData for category creation (server expects it even without images)
    const formData = new FormData();
    formData.append('name', categoryData.name);
    formData.append('description', categoryData.description || '');
    formData.append('parentCategoryId', categoryData.parentCategoryId || 0);
    
    // Add CreatedBy if present
    if (categoryData.CreatedBy) {
      formData.append('CreatedBy', categoryData.CreatedBy);
    }
    
    return this.request(ENDPOINTS.CATEGORIES_Admin, {
      method: 'POST',
      body: formData,
    });
  }

  // PUT update category
  async updateCategory(id, categoryData) {
    return this.request(`${ENDPOINTS.CATEGORIES_Admin}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  // DELETE category
  async deleteCategory(id) {
    return this.request(`${ENDPOINTS.CATEGORIES_Admin}/${id}`, {
      method: 'DELETE',
    });
  }

  // Course Management methods
  
  // GET all courses for admin with filters
  async getAllCoursesAdmin(filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Add pagination parameters
    if (filters.page !== undefined) queryParams.append('page', filters.page);
    if (filters.pageSize !== undefined) queryParams.append('pageSize', filters.pageSize);
    
    // Add course filter parameters
    if (filters.title) queryParams.append('Title', filters.title);
    if (filters.courseTypeId !== undefined) queryParams.append('CourseTypeId', filters.courseTypeId);
    if (filters.categoryId !== undefined) queryParams.append('CategoryId', filters.categoryId);   
    if (filters.isPaid !== undefined) queryParams.append('IsPaid', filters.isPaid);
    
    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINTS.COURSES_ADMIN}?${queryString}` : ENDPOINTS.COURSES_ADMIN;
    
    return this.request(url);
  }

  // GET course by ID for admin
  async getCourseByIdAdmin(courseId) {
    return this.request(`${ENDPOINTS.COURSE_BY_ID_ADMIN(courseId)}`);
  }

  // GET courses paginated for admin
  async getCoursesPaginatedAdmin({ page = 1, pageSize = 100 }) {
    const queryParams = new URLSearchParams({
      pageNumber: page,
      pageSize: pageSize
    });
    return this.request(`${ENDPOINTS.ADMINCOURSE}?${queryParams}`);
  }

  // GET all courses for admin (without pagination)
  async getAllCoursesAdminNoPagination(filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Add filter parameters - only add if they have values
    if (filters.CourseTypeId && filters.CourseTypeId !== '') {
      queryParams.append('CourseTypeId', filters.CourseTypeId);
    }
    if (filters.CategoryId && filters.CategoryId !== '') {
      queryParams.append('CategoryId', filters.CategoryId);
    }
    if (filters.CourseLevelId && filters.CourseLevelId !== '') {
      queryParams.append('CourseLevelId', filters.CourseLevelId);
    }
    if (filters.Title && filters.Title !== '') {
      queryParams.append('Title', filters.Title);
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINTS.ADMINCOURSE}?${queryString}` : ENDPOINTS.ADMINCOURSE;
    
    return this.request(url);
  }

  // GET course lecture content by lecture ID
  async getCourseLectureContent(lectureId) {
    return this.request(ENDPOINTS.COURSE_LECTURE_CONTENT(lectureId));
  }

  // GET all career paths for admin (without pagination)
  async getAllCareerPathsAdminNoPagination(filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Add filter parameters - only add if they have values
    if (filters.Title && filters.Title !== '') {
      queryParams.append('Title', filters.Title);
    }
    if (filters.Status && filters.Status !== '') {
      queryParams.append('Status', filters.Status);
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINTS.CAREER_PATHS}?${queryString}` : ENDPOINTS.CAREER_PATHS;
    
    return this.request(url);
  }

  // GET all course types
  async getAllCourseTypes() {
    return this.request(ENDPOINTS.COURSE_TYPES);
  }

  // GET all course levels
  async getAllCourseLevels() {
    return this.request(ENDPOINTS.COURSE_LEVELS);
  }

  // POST create new course
  async createCourse(courseData) {
    // Ensure sections and directLectures are included in the request if provided
    const requestData = {
      ...courseData,
      sections: courseData.sections || [],
      directLectures: courseData.directLectures || []
    };
    
    // Set default values for unpaid courses
    if (!requestData.isPaid) {
      requestData.price = 0;
      requestData.discountedPrice = 0;
      requestData.currencyCode = 'USD';
    }
    
    return this.request(ENDPOINTS.COURSES_ADMIN, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  // PUT update course
  async updateCourse(courseId, courseData) {
    // Ensure sections and directLectures are included in the request if provided
    const requestData = {
      ...courseData,
      sections: courseData.sections || [],
      directLectures: courseData.directLectures || []
    };
    
    // Set default values for unpaid courses
    if (!requestData.isPaid) {
      requestData.price = 0;
      requestData.discountedPrice = 0;
      requestData.currencyCode = 'USD';
    }
    
    return this.request(`${ENDPOINTS.COURSE_BY_ID_ADMIN(courseId)}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
  }

  // DELETE course
  async deleteCourse(courseId) {
    return this.request(`${ENDPOINTS.COURSE_BY_ID_ADMIN(courseId)}`, {
      method: 'DELETE',
    });
  }

  // GET all course tags
  async getAllCourseTags() {
    return this.request(ENDPOINTS.COURSE_TAGS);
  }

  // GET all course badges
  async getAllCourseBadges() {
    return this.request(ENDPOINTS.COURSE_BADGES);
  }

  // Course Badge Management methods
  
  // GET all course badges (new endpoint)
  async getAllCourseBadgesNew(queryString = '') {
    const endpoint = queryString ? `${ENDPOINTS.COURSE_BADGE_ALL}?${queryString}` : ENDPOINTS.COURSE_BADGE_ALL;
    return this.request(endpoint);
  }

  // GET course badge by ID
  async getCourseBadgeById(id) {
    return this.request(ENDPOINTS.COURSE_BADGE_BY_ID(id));
  }

  // POST create new course badge
  async createCourseBadge(badgeData) {
    return this.request(ENDPOINTS.COURSE_BADGE_CREATE, {
      method: 'POST',
      body: JSON.stringify(badgeData),
    });
  }

  // PUT update course badge
  async updateCourseBadge(badgeId, badgeData) {
    return this.request(ENDPOINTS.COURSE_BADGE_UPDATE(badgeId), {
      method: 'PUT',
      body: JSON.stringify(badgeData),
    });
  }

  // DELETE course badge
  async deleteCourseBadge(badgeId) {
    return this.request(ENDPOINTS.COURSE_BADGE_DELETE(badgeId), {
      method: 'DELETE',
    });
  }

  // New Badge CRUD Operations
  // GET all badges with pagination
  async getAllBadges(page = 1, pageSize = 10) {
    return this.request(`/Badges?page=${page}&pageSize=${pageSize}`);
  }

  // GET badge by ID
  async getBadgeById(id) {
    return this.request(`/Badges/${id}`);
  }

  // POST create new badge
  async createBadge(badgeData) {
    return this.request('/Badges', {
      method: 'POST',
      body: JSON.stringify(badgeData),
    });
  }

  // PUT update badge
  async updateBadge(badgeId, badgeData) {
    return this.request(`/Badges/${badgeId}`, {
      method: 'PUT',
      body: JSON.stringify(badgeData),
    });
  }

  // DELETE badge
  async deleteBadge(badgeId) {
    return this.request(`/Badges/${badgeId}`, {
      method: 'DELETE',
    });
  }

  // BadgeMap Assignment methods
  
  // GET badge assignments by type
  async getBadgeAssignments(badgeId, typeId) {
    return this.request(`/BadgeMap/${badgeId}/${typeId}`);
  }

  // POST assign badge to items
  async assignBadge(badgeId, typeId, assignedIds) {
    return this.request('/badgemap/assign', {
      method: 'POST',
      body: JSON.stringify({
        badgeId: badgeId,
        type: typeId,
        ids: assignedIds
      }),
    });
  }

  // GET all badge assignments for a badge (all types)
  async getAllBadgeAssignments(badgeId) {
    const [courses, categories, careerPaths] = await Promise.all([
      this.getBadgeAssignments(badgeId, 1),
      this.getBadgeAssignments(badgeId, 2),
      this.getBadgeAssignments(badgeId, 3)
    ]);
    
    return {
      courses: courses || [],
      categories: categories || [],
      careerPaths: careerPaths || []
    };
  }

  // GET course badges for dropdown
  async getCourseBadges() {
    return this.request(ENDPOINTS.COURSE_BADGES_DROPDOWN);
  }

  // GET course types
  async getCourseTypes() {
    return this.request(ENDPOINTS.COURSE_TYPES);
  }

  // GET course levels
  async getCourseLevels() {
    return this.request(ENDPOINTS.COURSE_LEVELS);
  }

  // UPDATE course tags
  async updateCourseTags(courseId, tagIds) {
    return this.request(`${ENDPOINTS.COURSE_BY_ID_ADMIN(courseId)}/tags`, {
      method: 'PUT',
      body: JSON.stringify(tagIds),
    });
  }

  // UPDATE course badge (for individual course badge assignment)
  async updateCourseBadgeAssignment(courseId, badgeId) {
    return this.request(`${ENDPOINTS.COURSE_BY_ID_ADMIN(courseId)}/badge`, {
      method: 'PUT',
      body: JSON.stringify({ badgeId }),
    });
  }

  // UPDATE course featured status
  async updateCourseFeatured(courseId, featured) {
    return this.request(`${ENDPOINTS.COURSE_BY_ID_ADMIN(courseId)}/featured`, {
      method: 'PUT',
      body: JSON.stringify({ featured }),
    });
  }

  // UPDATE course status
  async updateCourseStatus(courseId, status) {
    return this.request(`${ENDPOINTS.COURSE_BY_ID_ADMIN(courseId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Course Reviews Management methods
  
  // GET all reviews with optional filtering
  async getAllReviews(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.rating) queryParams.append('rating', filters.rating);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.pageSize) queryParams.append('pageSize', filters.pageSize);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `${ENDPOINTS.REVIEWS_ALL}?${queryString}` : ENDPOINTS.REVIEWS_ALL;
    
    return this.request(endpoint);
  }

  // GET review by ID
  async getReviewById(reviewId) {
    return this.request(ENDPOINTS.REVIEW_BY_ID(reviewId));
  }

  // UPDATE review status (approve/reject)
  async updateReviewStatus(reviewId, status) {
    return this.request(ENDPOINTS.REVIEW_UPDATE_STATUS(reviewId), {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // RESPOND to review
  async respondToReview(reviewId, response) {
    return this.request(ENDPOINTS.REVIEW_RESPOND(reviewId), {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  }

  // DELETE review
  async deleteReview(reviewId) {
    return this.request(ENDPOINTS.REVIEW_DELETE(reviewId), {
      method: 'DELETE',
    });
  }

  // MARK review as helpful/not helpful
  async markReviewHelpful(reviewId, helpful) {
    return this.request(ENDPOINTS.REVIEW_MARK_HELPFUL(reviewId), {
      method: 'PATCH',
      body: JSON.stringify({ helpful }),
    });
  }

  // Authentication methods
   async getAllRoles() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return routesData.roles;
  }

  // GET role by ID
  async getRoleById(roleId) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return routesData.roles.find(role => role.id === roleId);
  }

  // POST login authentication
  async login(username, password) {
    try {
      // Create a direct fetch request for login without any Authorization header
      const url = `${this.baseURL}${ENDPOINTS.AUTH_LOGIN}`;
      const config = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      };

      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || errorData.title || JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      let responseData;
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const textData = await response.text();
        responseData = textData ? { success: true, message: textData } : { success: true };
      }

      // Store the JWT token
      if (responseData.token) {
        localStorage.setItem('adminToken', responseData.token);
      }

      return {
        success: true,
        user: responseData.user,
        token: responseData.token,
        expiresAt: responseData.expiresAt
      };
    } catch (error) {
      console.error('AdminApi.login - Login failed:', error);
      // Handle authentication errors
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }
      
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }
  }

  // POST change password
  async changePassword(currentPassword, newPassword, confirmPassword) {
    try {
      const response = await this.request(ENDPOINTS.AUTH_CHANGE_PASSWORD, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword
        })
      });

      return {
        success: true,
        message: response.message || 'Password changed successfully'
      };
    } catch (error) {
      // Handle password change errors
      if (error.response?.status === 400) {
        return {
          success: false,
          message: error.response.data || 'Current password is incorrect'
        };
      }
      
      return {
        success: false,
        message: error.message || 'Password change failed'
      };
    }
  }

  // GET user by email
  async getUserByEmail(email) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return routesData.users.find(user => user.email === email);
  }

  // Career Paths Management methods
  
  // GET all career paths
  async getAllCareerPaths(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${ENDPOINTS.CAREER_PATHS}?${queryString}` : ENDPOINTS.CAREER_PATHS;
    return this.request(url);
  }

  // GET all courses for career path
  async getCareerPathCourses() {
    return this.request(`${ENDPOINTS.CAREER_PATHS}/courses`);
  }

  // GET courses by category and level for career path
  async getCareerPathCoursesByCategoryAndLevel(categoryId, levelId) {
    return this.request(`${ENDPOINTS.CAREER_PATHS}/courses/${categoryId}/${levelId}`);
  }

  // GET career path levels
  async getCareerPathLevels() {
    return this.request(`${ENDPOINTS.COURSE_LEVELS}`);
  }

  // GET career roles
  async getCareerRoles(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `${ENDPOINTS.CAREER_ROLES}?${queryString}` : ENDPOINTS.CAREER_ROLES;
    
    return this.request(endpoint);
  }

  // GET career role by ID
  async getCareerRoleById(id) {
    return this.request(ENDPOINTS.CAREER_ROLE_BY_ID(id));
  }

  // POST create new career role
  async createCareerRole(roleData) {
    return this.request(ENDPOINTS.CAREER_ROLE_CREATE, {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  // PUT update career role
  async updateCareerRole(id, roleData) {
    return this.request(ENDPOINTS.CAREER_ROLE_UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }

  // DELETE career role
  async deleteCareerRole(id) {
    return this.request(ENDPOINTS.CAREER_ROLE_DELETE(id), {
      method: 'DELETE',
    });
  }

  // Create career role with file upload (FormData)
  async createCareerRoleWithFile(formData) {
    const url = `${this.baseURL}${ENDPOINTS.CAREER_ROLE_CREATE}`;
    
    const config = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }

  // Update career role with file upload (FormData)
  async updateCareerRoleWithFile(id, formData) {
    const url = `${this.baseURL}${ENDPOINTS.CAREER_ROLE_UPDATE(id)}`;
    
    const config = {
      method: 'PUT',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }

  // GET career path by ID
  async getCareerPathById(id) {
    return this.request(`${ENDPOINTS.CAREER_PATHS}/${id}`);
  }

  // POST create new career path
  async createCareerPath(careerPathData) {
    return this.request(ENDPOINTS.CAREER_PATHS, {
      method: 'POST',
      body: JSON.stringify(careerPathData),
    });
  }

  // PUT update career path
  async updateCareerPath(id, careerPathData) {
    return this.request(`${ENDPOINTS.CAREER_PATHS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(careerPathData),
    });
  }

  // DELETE career path
  async deleteCareerPath(id) {
    return this.request(`${ENDPOINTS.CAREER_PATHS}/${id}`, {
      method: 'DELETE',
    });
  }

  // Create career path with file upload (FormData)
  async createCareerPathWithFile(formData) {
    const url = `${this.baseURL}${ENDPOINTS.CAREER_PATHS}`;
    
    const config = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || errorData.title || JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('Create career path with file failed:', error);
      throw error;
    }
  }

  // Update career path with file upload (FormData)
  async updateCareerPathWithFile(id, formData) {
    const url = `${this.baseURL}${ENDPOINTS.CAREER_PATHS}/${id}`;
    
    const config = {
      method: 'PUT',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || errorData.title || JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('Update career path with file failed:', error);
      throw error;
    }
  }

  // Create course with file upload (FormData)
  async createCourseWithFile(formData) {
    const url = `${this.baseURL}${ENDPOINTS.COURSE_CREATE}`;
    
    const config = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            // Handle different error response formats - prioritize "message" field
            errorDetails = errorData.message || errorData.error || errorData.title || 
                          (errorData.errors && Object.values(errorData.errors)[0]?.[0]) ||
                          JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('Create course with file failed:', error);
      throw error;
    }
  }

  // Upload CSV file for course creation
  async uploadCsvFile(formData) {
    const url = `${this.baseURL}${ENDPOINTS.COURSE_UPLOAD_CSV}`;
    
    const config = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            // Handle different error response formats - prioritize "message" field
            errorDetails = errorData.message || errorData.error || errorData.title || 
                          (errorData.errors && Object.values(errorData.errors)[0]?.[0]) ||
                          JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
      throw error;
    }
  }
async uploadCsvFileByName(formData) {
    const url = `${this.baseURL}${ENDPOINTS.COURSE_UPLOAD_CSV_By_Name}`;
    
    const config = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            // Handle different error response formats - prioritize "message" field
            errorDetails = errorData.message || errorData.error || errorData.title || 
                          (errorData.errors && Object.values(errorData.errors)[0]?.[0]) ||
                          JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
      throw error;
    }
  }

  // Upload CSV file for review creation
  async uploadReviewCsv(formData) {
    const url = `${this.baseURL}${ENDPOINTS.REVIEW_UPLOAD_CSV}`;
    
    const config = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            // Handle different error response formats - prioritize "message" field
            errorDetails = errorData.message || errorData.error || errorData.title || 
                          (errorData.errors && Object.values(errorData.errors)[0]?.[0]) ||
                          JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('Review CSV upload failed:', error);
      throw error;
    }
  }

  // Remove course thumbnail
  async removeThumbnail(courseId) {
    const url = `${this.baseURL}${ENDPOINTS.COURSE_REMOVE_THUMBNAIL(courseId)}`;
    
    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorDetails = errorData.message || errorData.error || errorData.title || 
                          (errorData.errors && Object.values(errorData.errors)[0]?.[0]) ||
                          JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('Remove thumbnail failed:', error);
      throw error;
    }
  }

  // Unified Template Management Methods
  async getTemplates(params = {}) {
    const url = `${this.baseURL}${ENDPOINTS.TEMPLATES}`;
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(fullUrl, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw error;
    }
  }

  async getTemplateById(id) {
    const url = `${this.baseURL}${ENDPOINTS.TEMPLATE_BY_ID(id)}`;
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch template:', error);
      throw error;
    }
  }

  async getTemplateTypes() {
    const url = `${this.baseURL}${ENDPOINTS.TEMPLATES_TYPES}`;
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch template types:', error);
      throw error;
    }
  }

  async createTemplate(templateData) {
    const url = `${this.baseURL}${ENDPOINTS.TEMPLATE_CREATE}`;
    
    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify(templateData),
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  }

  async updateTemplate(id, templateData) {
    const url = `${this.baseURL}${ENDPOINTS.TEMPLATE_UPDATE(id)}`;
    
    const config = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify(templateData),
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  }

  async deleteTemplate(id) {
    const url = `${this.baseURL}${ENDPOINTS.TEMPLATE_DELETE(id)}`;

    const config = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      // Handle empty response body (e.g., 204 No Content)
      const text = await response.text();
      return text ? JSON.parse(text) : { success: true };
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  // Update course with file upload (FormData)
  async updateCourseWithFile(id, formData) {
    const url = `${this.baseURL}${ENDPOINTS.COURSE_BY_ID_ADMIN(id)}`;
    
    const config = {
      method: 'PUT',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            // Handle different error response formats - prioritize "message" field
            errorDetails = errorData.message || errorData.error || errorData.title || 
                          (errorData.errors && Object.values(errorData.errors)[0]?.[0]) ||
                          JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('Update course with file failed:', error);
      throw error;
    }
  }

  // Generate course content
  async generateCourseContent(courseId, prompt) {
    return await this.request(ENDPOINTS.COURSE_GENERATE_CONTENT, {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        prompt
      })
    });
  }

  // Create category with file upload (FormData)
  async createCategoryWithFile(formData) {
    const url = `${this.baseURL}${ENDPOINTS.CATEGORIES_Admin}`;
    
    const config = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || errorData.title || JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('Create category with file failed:', error);
      throw error;
    }
  }

  // Update category with file upload (FormData)
  async updateCategoryWithFile(id, formData) {
    const url = `${this.baseURL}${ENDPOINTS.CATEGORIES_Admin}/${id}`;
    
    const config = {
      method: 'PUT', // Revert back to PUT
      body: formData,
      // Don't set Content-Type header when using FormData, browser sets it automatically
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      timeout: this.timeout,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || errorData.title || JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorDetails = textData || response.statusText || 'Unknown error';
          }
        } catch (parseError) {
          errorDetails = response.statusText || 'Unknown error';
        }
        
        const error = new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorDetails
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const textData = await response.text();
        return textData ? { success: true, message: textData } : { success: true };
      }
    } catch (error) {
      console.error('Update category with file failed:', error);
      throw error;
    }
  }

  // Course Skill Mapping methods
  
  // GET all skills (updated to correct endpoint)
  async getAllSkillsWithPagination(queryParams = '') {
    const url = queryParams ? `${ENDPOINTS.SKILLS_ALL}?${queryParams}` : ENDPOINTS.SKILLS_ALL;
    return this.request(url);
  }

  // GET all skills (legacy method for compatibility)
  async getAllSkills() {
    return this.request(ENDPOINTS.SKILLS_ALL);
  }

  // GET all career skills
  async getAllCareerSkills(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `${ENDPOINTS.CAREER_SKILLS}?${queryString}` : ENDPOINTS.CAREER_SKILLS;
    
    return this.request(endpoint);
  }

  // GET career skill by ID
  async getCareerSkillById(id) {
    return this.request(ENDPOINTS.CAREER_SKILL_BY_ID(id));
  }

  // POST create new career skill
  async createCareerSkill(skillData) {
    return this.request(ENDPOINTS.CAREER_SKILL_CREATE, {
      method: 'POST',
      body: JSON.stringify(skillData),
    });
  }

  // PUT update career skill
  async updateCareerSkill(id, skillData) {
    return this.request(ENDPOINTS.CAREER_SKILL_UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(skillData),
    });
  }

  // DELETE career skill
  async deleteCareerSkill(id) {
    return this.request(ENDPOINTS.CAREER_SKILL_DELETE(id), {
      method: 'DELETE',
    });
  }

  // Topic CRUD methods
  
  // GET all topics
  async getAllTopics(page = null, pageSize = null) {
    let url = ENDPOINTS.TOPICS_ALL;

    // Build query parameters
    const params = new URLSearchParams();
    
    // Add pagination params if provided
    if (page !== null && pageSize !== null) {
      params.append('page', page);
      params.append('pageSize', pageSize);
    }
    
    // Add params to URL if any exist
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.request(url);
  }

  // GET topic by ID
  async getTopicById(id) {
    return this.request(ENDPOINTS.TOPIC_BY_ID(id));
  }

  // POST create new topic
  async createTopic(topicData) {
    return this.request(ENDPOINTS.TOPIC_CREATE, {
      method: 'POST',
      body: JSON.stringify(topicData),
    });
  }

  // PUT update topic
  async updateTopic(id, topicData) {
    return this.request(ENDPOINTS.TOPIC_UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(topicData),
    });
  }

  // DELETE topic
  async deleteTopic(id) {
    return this.request(ENDPOINTS.TOPIC_DELETE(id), {
      method: 'DELETE',
    });
  }

  // Topic Mapping methods
  
  // GET topic mapping
  async getTopicMapping(topicId, type) {
    return this.request(ENDPOINTS.TOPIC_MAPPING_GET(topicId, type));
  }

  // POST create topic mapping assignment
  async createTopicMapping(mappingData) {
    return this.request(ENDPOINTS.TOPIC_MAPPING_ASSIGN, {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  }

  // GET all subcategories
  async getAllSubcategories() {
    return this.request(ENDPOINTS.SUBCATEGORIES);
  }

  // GET search subcategories
  async searchSubcategories(searchTerm = '') {
    const queryParams = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return this.request(`${ENDPOINTS.SUBCATEGORIES}${queryParams}`);
  }

  // GET all subcategories without pagination
  async getAllSubcategoriesNoPagination(searchTerm = '') {
    const queryParams = searchTerm ? `?name=${encodeURIComponent(searchTerm)}` : '';
    return this.request(`${ENDPOINTS.SUBCATEGORIES}${queryParams}`);
  }

  // GET skill by ID with course mappings
  async getSkillById(skillId) {
    return this.request(ENDPOINTS.COURSE_SKILL_MAP_BY_ID(skillId));
  }

  // POST sync courses to skill
  async syncCoursesToSkill(skillId, courseIds) {
    return this.request(ENDPOINTS.COURSE_SKILL_MAP_SYNC, {
      method: 'POST',
      body: JSON.stringify({
        skillId: skillId,
        courseIds: courseIds
      })
    });
  }

  // Skill Mapping methods (similar to badge assignment)
  
  // POST assign skill mapping
  async assignSkillMapping(skillId, type, ids) {
    return this.request(ENDPOINTS.SKILL_MAPPING_ASSIGN, {
      method: 'POST',
      body: JSON.stringify({
        skillId: skillId,
        type: type,
        ids: ids
      })
    });
  }

  // GET skill mapping by skillId and type
  async getSkillMapping(skillId, type) {
    return this.request(ENDPOINTS.SKILL_MAPPING_GET(skillId, type));
  }

  // GET filtered courses
  async getFilteredCourses(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINTS.COURSE_FILTER}?${queryString}` : ENDPOINTS.COURSE_FILTER;
    
    return this.request(url);
  }

  // Routes and Roles Management
  
  // GET all routes
  async getAllRoutes() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return routesData.routes;
  }

  // GET routes filtered by user role
  async getRoutesByRole(roleId = null) {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Return all routes without role filtering, but exclude reviews and review-management
    return routesData.routes
      .filter(route => 
        route.id !== 'reviews' && // Exclude reviews route
        route.id !== 'review-management' && // Exclude review-management route
        route.label !== 'Review Management' // Exclude any Review Management items
      )
      .sort((a, b) => a.order - b.order);
  }

  // GET routes by category
  async getRoutesByCategory(category, roleId) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const filteredRoutes = routesData.routes.filter(route => 
      route.category === category
    ).sort((a, b) => a.order - b.order);
    
    return filteredRoutes;
  }

  // Email Template CRUD Operations
  async getEmailTemplates(page = 1, pageSize = 100) {
    return this.request(`${ENDPOINTS.EMAIL_TEMPLATE_ALL}?page=${page}&pageSize=${pageSize}`);
  }

  async getEmailTemplateById(id) {
    return this.request(ENDPOINTS.EMAIL_TEMPLATE_BY_ID(id));
  }

  async createEmailTemplate(templateData) {
    return this.request(ENDPOINTS.EMAIL_TEMPLATE_CREATE, {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  async updateEmailTemplate(id, templateData) {
    return this.request(ENDPOINTS.EMAIL_TEMPLATE_UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
  }

  async deleteEmailTemplate(id) {
    return this.request(ENDPOINTS.EMAIL_TEMPLATE_DELETE(id), {
      method: 'DELETE',
    });
  }

  // Certificate Template CRUD Operations
  async getCertificateTemplates(page = 1, pageSize = 100) {
    return this.request(`${ENDPOINTS.CERTIFICATE_TEMPLATE_ALL}?page=${page}&pageSize=${pageSize}`);
  }

  async getCertificateTemplateById(id) {
    return this.request(ENDPOINTS.CERTIFICATE_TEMPLATE_BY_ID(id));
  }

  async getCertificateTemplateByKey(templateKey) {
    return this.request(ENDPOINTS.CERTIFICATE_TEMPLATE_BY_KEY(templateKey));
  }

  async createCertificateTemplate(templateData) {
    return this.request(ENDPOINTS.CERTIFICATE_TEMPLATE_CREATE, {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  async updateCertificateTemplate(id, templateData) {
    return this.request(ENDPOINTS.CERTIFICATE_TEMPLATE_UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
  }

  async deleteCertificateTemplate(id) {
    return this.request(ENDPOINTS.CERTIFICATE_TEMPLATE_DELETE(id), {
      method: 'DELETE',
    });
  }

  // ==================== DISCOUNT RATES ====================

  // GET all discount rates with pagination and search
  async getAllDiscountRates(params = {}) {
    const queryParams = new URLSearchParams();
    
    // Add pagination parameters
    if (params.page !== undefined) queryParams.append('page', params.page);
    if (params.pageSize !== undefined) queryParams.append('pageSize', params.pageSize);
    
    // Add search parameter
    if (params.search && typeof params.search === 'string') {
      queryParams.append('search', params.search);
    } else if (params.search) {
      console.warn('Invalid search parameter type in AdminApi:', typeof params.search, params.search);
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINTS.DISCOUNT_RATES}?${queryString}` : ENDPOINTS.DISCOUNT_RATES;
    return this.request(url);
  }

  // GET discount rate by ID
  async getDiscountRateById(id) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_BY_ID(id));
  }

  // GET discount types dropdown
  async getDiscountTypes() {
    return this.request(ENDPOINTS.DISCOUNT_RATES_TYPES_DROPDOWN);
  }

  // CREATE new discount rate
  async createDiscountRate(discountRateData) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_CREATE, {
      method: 'POST',
      body: JSON.stringify(discountRateData),
    });
  }

  // UPDATE discount rate
  async updateDiscountRate(id, discountRateData) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(discountRateData),
    });
  }

  // DELETE discount rate
  async deleteDiscountRate(id) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_DELETE(id), {
      method: 'DELETE',
    });
  }

  // ==================== DISCOUNT RATE MAPPINGS ====================

  // GET all discount rate mappings
  async getAllDiscountRateMappings(params = {}) {
    const queryParams = new URLSearchParams();
    
    // Add pagination parameters
    if (params.page !== undefined) queryParams.append('page', params.page);
    if (params.pageSize !== undefined) queryParams.append('pageSize', params.pageSize);
    
    // Add search parameter
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINTS.DISCOUNT_RATES_MAPPINGS}?${queryString}` : ENDPOINTS.DISCOUNT_RATES_MAPPINGS;
    
    return this.request(url);
  }

  // GET discount rate mappings by course ID
  async getDiscountRateMappingsByCourse(courseId) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_MAPPINGS_BY_COURSE(courseId));
  }

  // GET discount rate mapping by ID
  async getDiscountRateMappingById(id) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_MAPPINGS_BY_ID(id));
  }

  // CREATE new discount rate mapping
  async createDiscountRateMapping(mappingData) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_MAPPINGS, {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  }

  // ASSIGN discount rate to course
  async assignDiscountRate(courseId, discountRateId, userId = null) {
    const queryParams = userId ? `?userId=${userId}` : '';
    const url = `${ENDPOINTS.DISCOUNT_RATES_ASSIGN}${queryParams}`;
    
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        discountRateId
      }),
    });
  }

  // ASSIGN discount rate to course type
  async assignDiscountRateToCourseType(courseTypeId, discountRateId, courseId = null) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_ASSIGN_COURSE_TYPE, {
      method: 'POST',
      body: JSON.stringify({
        courseId: courseId || 0,
        discountRateId,
        courseTypeId
      }),
    });
  }

  // ASSIGN discount rate to career path
  async assignDiscountRateToCareerPath(careerPathId, discountRateId) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_ASSIGN_CAREER_PATH, {
      method: 'POST',
      body: JSON.stringify({
        careerPathId,
        discountRateId
      }),
    });
  }

  // ASSIGN price to course type
  async assignPriceToCourseType(courseTypeId, price) {
    return this.request(`/courses/assign-price?courseTypeId=${courseTypeId}&price=${price}`, {
      method: 'POST',
    });
  }

  // ASSIGN price with PriceType (universal method for courses, course types, and career paths)
  async assignPrice(priceType, courseTypeId, price) {
    const params = new URLSearchParams({
      PriceType: priceType,
      courseTypeId: courseTypeId.toString(),
      price: price.toString()
    });
    return this.request(`/courses/assign-price?${params}`, {
      method: 'POST',
    });
  }

  // GET student orders
  async getStudentOrders(customerId) {
    return this.request(`/StudentManagement/${customerId}/orders`, {
      method: 'GET',
    });
  }

  // UPDATE discount rate mapping
  async updateDiscountRateMapping(id, mappingData) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_MAPPINGS_UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(mappingData),
    });
  }

  // DELETE discount rate mapping
  async deleteDiscountRateMapping(id) {
    return this.request(ENDPOINTS.DISCOUNT_RATES_MAPPINGS_DELETE(id), {
      method: 'DELETE',
    });
  }

  // Generic HTTP methods for custom endpoints
  
  // GET request
  async get(endpoint) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // ==================== SLUG MANAGEMENT ====================

  // Update course slug
  async updateCourseSlug(courseId, slug) {
    return this.request(`/SlugManagment/update-course-slug?courseId=${courseId}&slug=${encodeURIComponent(slug)}`, {
      method: 'POST',
    });
  }

  // Update all course slugs
  async updateAllCourseSlugs() {
    return this.request('/SlugManagment/update-all-course-slugs', {
      method: 'POST',
    });
  }

  // Get slug by course ID
  async getSlugByCourseId(courseId) {
    return this.request(`/SlugManagment/getSlugByCourseId/${courseId}`, {
      method: 'GET',
    });
  }

  // Update all career path slugs
  async updateAllCareerPathSlugs() {
    return this.request('/SlugManagment/Update-All-CareerPath-Slugs', {
      method: 'POST',
    });
  }

  // Update career path slug
  async updateCareerPathSlug(careerPathId, slug) {
    return this.request(`/SlugManagment/Update-CareerPath-Slug?careerPathId=${careerPathId}&slug=${encodeURIComponent(slug)}`, {
      method: 'POST',
    });
  }

  // Get slug by career path ID
  async getSlugByCareerPathId(careerPathId) {
    return this.request(`/SlugManagment/getSlugByCareerPathId/${careerPathId}`, {
      method: 'GET',
    });
  }

  // Update all category slugs
  async updateAllCategorySlugs() {
    return this.request('/SlugManagment/update-all-categories-slugs', {
      method: 'POST',
    });
  }

  // Update category slug
  async updateCategorySlug(categoryId, slug) {
    return this.request(`/SlugManagment/update-category-slug?categoryId=${categoryId}&slug=${encodeURIComponent(slug)}`, {
      method: 'POST',
    });
  }

  // Get slug by category ID
  async getSlugByCategoryId(categoryId) {
    return this.request(`/SlugManagment/getSlugByCategoryId/${categoryId}`, {
      method: 'GET',
    });
  }

  // ==================== PAYMENT PROVIDERS ====================

  // GET all payment providers
  async getAllPaymentProviders() {
    return this.request(ENDPOINTS.PAYMENT_PROVIDERS, {
      method: 'GET',
    });
  }

  // GET payment provider by ID
  async getPaymentProviderById(id) {
    return this.request(ENDPOINTS.PAYMENT_PROVIDER_BY_ID(id), {
      method: 'GET',
    });
  }

  // CREATE new payment provider
  async createPaymentProvider(providerData) {
    return this.request(ENDPOINTS.PAYMENT_PROVIDERS, {
      method: 'POST',
      body: JSON.stringify(providerData),
    });
  }

  // UPDATE payment provider
  async updatePaymentProvider(id, providerData) {
    return this.request(ENDPOINTS.PAYMENT_PROVIDER_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(providerData),
    });
  }

  // DELETE payment provider
  async deletePaymentProvider(id) {
    return this.request(ENDPOINTS.PAYMENT_PROVIDER_BY_ID(id), {
      method: 'DELETE',
    });
  }

  // ==================== PAYMENT PROVIDER ACCOUNTS ====================

  // GET all payment provider accounts
  async getAllPaymentProviderAccounts() {
    return this.request(ENDPOINTS.PAYMENT_PROVIDER_ACCOUNTS, {
      method: 'GET',
    });
  }

  // GET payment provider account by ID
  async getPaymentProviderAccountById(id) {
    return this.request(ENDPOINTS.PAYMENT_PROVIDER_ACCOUNT_BY_ID(id), {
      method: 'GET',
    });
  }

  // CREATE new payment provider account
  async createPaymentProviderAccount(accountData) {
    return this.request(ENDPOINTS.PAYMENT_PROVIDER_ACCOUNTS, {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  // UPDATE payment provider account
  async updatePaymentProviderAccount(id, accountData) {
    return this.request(ENDPOINTS.PAYMENT_PROVIDER_ACCOUNT_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(accountData),
    });
  }

  // DELETE payment provider account
  async deletePaymentProviderAccount(id) {
    return this.request(ENDPOINTS.PAYMENT_PROVIDER_ACCOUNT_BY_ID(id), {
      method: 'DELETE',
    });
  }

  // ==================== CONTACT INFORMATION ====================

  // GET all contact information with optional filters and pagination
  async getContactInformation(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.fullName) queryParams.append('fullName', filters.fullName);
    if (filters.emailAddress) queryParams.append('emailAddress', filters.emailAddress);
    if (filters.phoneNumber) queryParams.append('phoneNumber', filters.phoneNumber);
    if (filters.inquiryOptionId) queryParams.append('inquiryOptionId', filters.inquiryOptionId);
    if (filters.page) queryParams.append('Page', filters.page);
    if (filters.pageSize) queryParams.append('PageSize', filters.pageSize);

    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINTS.CONTACT_INFORMATION}?${queryString}` : ENDPOINTS.CONTACT_INFORMATION;
    
    return this.request(url, {
      method: 'GET',
    });
  }

  // GET inquiry options for dropdown
  async getInquiryOptions() {
    return this.request(ENDPOINTS.INQUIRY_OPTIONS, {
      method: 'GET',
    });
  }

  // ==================== BOOK BADGE MAPPING ====================

  // GET books by badge ID (returns book IDs that have this badge)
  async getBookBadgeMapping(badgeId) {
    return this.request(ENDPOINTS.BOOK_BADGE_MAPPING_GET_BY_BADGE(badgeId), {
      method: 'GET',
    });
  }

  // GET badges for a specific book ID (returns badge IDs for a book)
  async getBookBadgeMappingByBook(bookId) {
    return this.request(ENDPOINTS.BOOK_BADGE_MAPPING_GET_BY_BADGE(bookId), {
      method: 'GET',
    });
  }

  // POST assign badges to book
  async assignBookBadgeMapping(mappingData) {
    return this.request(ENDPOINTS.BOOK_BADGE_MAPPING_ASSIGN, {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  }

  // ==================== PUBLISHER BADGE MAPPING ====================

  // GET publishers by badge ID (returns publisher IDs that have this badge)
  async getPublisherBadgeMapping(badgeId) {
    return this.request(ENDPOINTS.PUBLISHER_BADGE_MAPPING_GET_BY_BADGE(badgeId), {
      method: 'GET',
    });
  }

  // POST assign badges to publisher
  async assignPublisherBadgeMapping(mappingData) {
    return this.request(ENDPOINTS.PUBLISHER_BADGE_MAPPING_ASSIGN, {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  }

  // ==================== BOOK BADGE MANAGEMENT ====================

  // GET all book badges with pagination and optional badgeName filter
  async getAllBookBadges(page = 1, pageSize = 10, badgeName = '') {
    let url = `${ENDPOINTS.BOOK_BADGE_ALL}?page=${page}&pageSize=${pageSize}`;
    if (badgeName && badgeName.trim() !== '') {
      url += `&BadgeName=${encodeURIComponent(badgeName.trim())}`;
    }
    return this.request(url);
  }
    async getAllPublisherBadges(page = 1, pageSize = 10, badgeName = '') {
    let url = `${ENDPOINTS.PUBLISHER_BADGES}?page=${page}&pageSize=${pageSize}`;
    if (badgeName && badgeName.trim() !== '') {
      url += `&BadgeName=${encodeURIComponent(badgeName.trim())}`;
    }
    return this.request(url);
  }

  // GET book badge by ID
  async getBookBadgeById(badgeId) {
    return this.request(ENDPOINTS.BOOK_BADGE_BY_ID(badgeId));
  }

  // POST create new book badge
  async createBookBadge(badgeData) {
    return this.request(ENDPOINTS.BOOK_BADGE_CREATE, {
      method: 'POST',
      body: JSON.stringify(badgeData),
    });
  }

  // PUT update book badge
  async updateBookBadge(badgeId, badgeData) {
    return this.request(ENDPOINTS.BOOK_BADGE_UPDATE(badgeId), {
      method: 'PUT',
      body: JSON.stringify(badgeData),
    });
  }

  // DELETE book badge
  async deleteBookBadge(badgeId) {
    return this.request(ENDPOINTS.BOOK_BADGE_DELETE(badgeId), {
      method: 'DELETE',
    });
  }

  // ==================== PUBLISHER BADGE MANAGEMENT ====================

  // GET all publisher badges with pagination and optional badgeName filter
  async getAllPublisherBadgesManagement(page = 1, pageSize = 10, badgeName = '') {
    let url = `${ENDPOINTS.PUBLISHER_BADGE_ALL}?page=${page}&pageSize=${pageSize}`;
    if (badgeName && badgeName.trim() !== '') {
      url += `&BadgeName=${encodeURIComponent(badgeName.trim())}`;
    }
    return this.request(url);
  }

  // GET publisher badge by ID
  async getPublisherBadgeById(badgeId) {
    return this.request(ENDPOINTS.PUBLISHER_BADGE_BY_ID(badgeId));
  }

  // POST create new publisher badge
  async createPublisherBadge(badgeData) {
    return this.request(ENDPOINTS.PUBLISHER_BADGE_CREATE, {
      method: 'POST',
      body: JSON.stringify(badgeData),
    });
  }

  // PUT update publisher badge
  async updatePublisherBadge(badgeId, badgeData) {
    return this.request(ENDPOINTS.PUBLISHER_BADGE_UPDATE(badgeId), {
      method: 'PUT',
      body: JSON.stringify(badgeData),
    });
  }

  // DELETE publisher badge
  async deletePublisherBadge(badgeId) {
    return this.request(ENDPOINTS.PUBLISHER_BADGE_DELETE(badgeId), {
      method: 'DELETE',
    });
  }

  // ==================== BOOK CATEGORY MANAGEMENT ====================

  // GET all book categories with pagination and title filter
  async getAllBookCategories(page = 1, pageSize = 20, title = '') {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (title && title.trim() !== '') {
      queryParams.append('title', title.trim());
    }

    return this.request(`${ENDPOINTS.BOOK_CATEGORY_ALL}?${queryParams}`);
  }

  // GET book category by ID
  async getBookCategoryById(id) {
    return this.request(ENDPOINTS.BOOK_CATEGORY_BY_ID(id));
  }

  // POST create new book category with file upload
  async createBookCategory(categoryData) {
    const formData = new FormData();
    
    if (categoryData.Name !== undefined) {
      formData.append('Name', categoryData.Name);
    }
    if (categoryData.Description !== undefined) {
      formData.append('Description', categoryData.Description);
    }
    if (categoryData.File) {
      formData.append('File', categoryData.File);
    }
    if (categoryData.CoverFile) {
      formData.append('CoverFile', categoryData.CoverFile);
    }
    if (categoryData.AltTextImage !== undefined) {
      formData.append('AltTextImage', categoryData.AltTextImage);
    }
    if (categoryData.CreatedBy !== undefined) {
      formData.append('CreatedBy', categoryData.CreatedBy);
    }

    return this.request(ENDPOINTS.BOOK_CATEGORY_CREATE, {
      method: 'POST',
      body: formData,
    });
  }

  // PUT update book category with file upload
  async updateBookCategory(id, categoryData) {
    const formData = new FormData();
    
    if (categoryData.Name !== undefined) {
      formData.append('Name', categoryData.Name);
    }
    if (categoryData.Description !== undefined) {
      formData.append('Description', categoryData.Description);
    }
    if (categoryData.File) {
      formData.append('File', categoryData.File);
    }
    if (categoryData.CoverFile) {
      formData.append('CoverFile', categoryData.CoverFile);
    }
    if (categoryData.AltTextImage !== undefined) {
      formData.append('AltTextImage', categoryData.AltTextImage);
    }
    if (categoryData.UpdatedBy !== undefined) {
      formData.append('UpdatedBy', categoryData.UpdatedBy);
    }
    if (categoryData.IsIconRemoved !== undefined) {
      formData.append('IsIconRemoved', categoryData.IsIconRemoved);
    }
    if (categoryData.IsCoverRemoved !== undefined) {
      formData.append('IsCoverRemoved', categoryData.IsCoverRemoved);
    }

    return this.request(ENDPOINTS.BOOK_CATEGORY_UPDATE(id), {
      method: 'PUT',
      body: formData,
    });
  }

  // DELETE book category
  async deleteBookCategory(id) {
    return this.request(ENDPOINTS.BOOK_CATEGORY_DELETE(id), {
      method: 'DELETE',
    });
  }

  // LMS Leads Management methods
  
  /**
   * GET LMS Leads list with pagination, search, and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (1-based)
   * @param {number} params.pageSize - Items per page (1-100)
   * @param {string} params.search - Search term (matches name, email, phone, institute)
   * @param {number} params.customerTypeId - Filter by customer type
   * @param {string} params.sortBy - Sort field (signupDate, customerName, email, institute, customerType, country)
   * @param {string} params.sortDirection - Sort direction (asc|desc)
   * @returns {Promise<Object>} API response with items, pagination, etc.
   */
  async getLmsLeads(params = {}) {
    const queryParams = new URLSearchParams();
    
    // Add pagination params (defaults handled by backend)
    if (params.page) queryParams.append('page', params.page);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    
    // Add search param
    if (params.search) queryParams.append('search', params.search);
    
    // Add filter params
    if (params.customerTypeId) queryParams.append('customerTypeId', params.customerTypeId);
    
    // Add sorting params
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    
    const queryString = queryParams.toString();
    const url = queryString ? `${ENDPOINTS.LEADS_MANAGEMENT_LIST}?${queryString}` : ENDPOINTS.LEADS_MANAGEMENT_LIST;
    
    return this.request(url);
  }

  /**
   * GET LMS Lead details by customer ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} API response with lead details and signup answers
   */
  async getLmsLeadDetails(customerId) {
    return this.request(ENDPOINTS.LEADS_MANAGEMENT_DETAILS(customerId));
  }

  /**
   * GET LMS Customer Types for filter dropdown
   * @returns {Promise<Object>} API response with customer types array
   */
  async getLmsCustomerTypes() {
    return this.request(ENDPOINTS.LEADS_MANAGEMENT_CUSTOMER_TYPES);
  }
}

export default new ApiService();
