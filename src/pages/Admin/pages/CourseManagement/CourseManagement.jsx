import  { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../../../hooks/api/useAdmin';
import { useDebounce } from '../../../../hooks/utils/useDebounce';
import { useCourseFilters } from '../../../../hooks/utils/useCourseFilters';
import { useModalState } from '../../../../hooks/utils/useModalState';
import { useToast } from '../../../../hooks/utils/useToast';
import { COURSE_MANAGEMENT_CONSTANTS } from '../../../../constants/courseManagement';
import { filterCoursesBySearch } from '../../../../utils/courseUtils';
import {  ChevronDown, Image, DollarSign, BookOpen, Globe, CheckCircle, XCircle, Filter, Users, Plus, X, Play, Award, Eye, Edit2, Trash2, Star, MessageSquare, Clock, Tag, Layers, Video, FileText, Upload, ChevronRight } from 'lucide-react';
import CategoryDropdown from '../../../../components/CategoryDropdown';
import CourseModal from '../../../../components/CourseModal';
import CsvUploadModal from '../../../../components/CsvUploadModal';
import UniversalVirtualizedTable from '../../../../components/UniversalVirtualizedTable';
import AdminPageLayout from '../../../../components/AdminPageLayout';
import { courseTableColumns } from '../../../../config/tableConfigurations';

const CourseManagement = () => {
  const { 
    error, getCourseById, clearError,
    getCourseTypes, getCourseLevels, getCourseTopics, deleteCourse, getAllCoursesAdmin,
    createCourseWithFile, uploadCourseCsv, updateCourseWithFile, getAllCourseBadgesNew, getAllSkills, generateCourseContent, removeThumbnail,
    getAllSubcategories
  } = useAdmin();
  
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const { modalState, openModal, closeModal, setModalLoading, setModalError } = useModalState();
  const { 
    filters, 
    setFilters,
    filtersLoading, 
    paginationInfo, 
    setFiltersLoading, 
    setPaginationInfo, 
    handleFilterChange, 
    resetFilters, 
    getActiveFilters 
  } = useCourseFilters();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [courseTypeTotals, setCourseTypeTotals] = useState({
    basic: undefined,
    intermediate: undefined,
    advanced: undefined
  });

  // Clear both modal and global errors when closing modal
  const handleCloseModal = () => {
    closeModal();
    clearError();
  };
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [courseDetails, setCourseDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState({});

  const [subcategories, setSubcategories] = useState([]);
  const [courseLevels, setCourseLevels] = useState([]);
  const [courseTypes, setCourseTypes] = useState([]);
  const [courseTopics, setCourseTopics] = useState([]);
  const [badges, setBadges] = useState([]);
  const [courseSkills, setCourseSkills] = useState([]);
  
  const [dropdownLoading, setDropdownLoading] = useState({
    subcategories: false,
    courseLevels: false,
    courseTypes: false,
    courseTopics: false,
    badges: false,
    courseSkills: false
  });
  
  const [dropdownError, setDropdownError] = useState({
    subcategories: '',
    courseLevels: '',
    courseTypes: '',
    courseTopics: '',
    badges: '',
    courseSkills: ''
  });
  
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [promptError, setPromptError] = useState('');
  
  // CSV Upload Modal State
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvModalLoading, setCsvModalLoading] = useState(false);
  const [csvModalError, setCsvModalError] = useState('');
  
  // Accordion state for professional hierarchy
  const [expandedSections, setExpandedSections] = useState({});

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, COURSE_MANAGEMENT_CONSTANTS.SEARCH_DEBOUNCE_DELAY);

  // Memoized calculations
  const searchFilteredCourses = useMemo(() => {
    const result = filterCoursesBySearch(filteredCourses, debouncedSearchTerm);
    return result;
  }, [filteredCourses, debouncedSearchTerm]);

  const typeCounts = useMemo(() => {
    const counts = {
      advanced: 0,
      intermediate: 0,
      basic: 0
    };

    for (const course of filteredCourses || []) {
      const typeId = course?.courseTypeId ?? course?.courseTypeID ?? course?.typeId;
      const typeName = (course?.courseTypeName || course?.courseTypeTitle || '').toString().toLowerCase();

      if (typeId === 1 || typeName.includes('advanced')) counts.advanced += 1;
      else if (typeId === 2 || typeName.includes('intermediate')) counts.intermediate += 1;
      else if (typeId === 3 || typeName.includes('basic')) counts.basic += 1;
    }

    return counts;
  }, [filteredCourses]);

  const handleCourseTypeSelect = useCallback(async (courseTypeId) => {
    const updatedFilters = {
      ...filters,
      page: 1,
      courseTypeId
    };

    setFilters(updatedFilters);

    if (filtersLoading) return;

    setFiltersLoading(true);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(updatedFilters).filter(([key, value]) => {
          // Always include page and pageSize regardless of their value
          if (key === 'page' || key === 'pageSize') return true;
          // For other fields, filter out empty/falsy values
          return value !== '' && value !== 0 && value !== null && value !== undefined;
        })
      );

      const coursesData = await getAllCoursesAdmin(activeFilters);
      const coursesArray = coursesData?.items || coursesData?.data || coursesData || [];
      setFilteredCourses(coursesArray);

      setCourseTypeTotals({
        basic: coursesData?.totalBasicCount,
        intermediate: coursesData?.totalIntermediateCount,
        advanced: coursesData?.totalAdvanceCount
      });

      if (coursesData?.page !== undefined) {
        setPaginationInfo({
          page: coursesData.page,
          pageSize: coursesData.pageSize,
          totalCount: coursesData.totalCount || coursesArray.length
        });
      }
    } catch (error) {
      showToast('Failed to apply course type filter', 'error');
    } finally {
      setFiltersLoading(false);
    }
  }, [filters, filtersLoading, getAllCoursesAdmin, setCourseTypeTotals, setFilters, setFilteredCourses, setFiltersLoading, setPaginationInfo, showToast]);

  // Memoized stats for header
  const statsCards = useMemo(() => {
    const selectedTypeId = filters.courseTypeId;

    const makeCard = (typeId, label, value, icon, iconBg) => ({
      label,
      value,
      icon,
      iconBg,
      selected: selectedTypeId === typeId,
      onClick: () => {
        const nextTypeId = selectedTypeId === typeId ? 0 : typeId;
        handleCourseTypeSelect(nextTypeId);
      }
    });

    return [
      makeCard(
        0,
        'All Courses',
        paginationInfo.totalCount || 0,
        <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
        'bg-orange-100 dark:bg-orange-900'
      ),
      makeCard(
        3,
        'Basic Course',
        courseTypeTotals.basic ?? typeCounts.basic,
        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        'bg-blue-100 dark:bg-blue-900'
      ),
      makeCard(
        2,
        'Intermediate Course',
        courseTypeTotals.intermediate ?? typeCounts.intermediate,
        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
        'bg-purple-100 dark:bg-purple-900'
      ),
      makeCard(
        1,
        'Advanced Course',
        courseTypeTotals.advanced ?? typeCounts.advanced,
        <Award className="w-4 h-4 text-green-600 dark:text-green-400" />,
        'bg-green-100 dark:bg-green-900'
      )
    ];
  }, [courseTypeTotals.advanced, courseTypeTotals.basic, courseTypeTotals.intermediate, filters.courseTypeId, paginationInfo.totalCount, typeCounts]);

  const displayTotalCount = useMemo(() => {
    if (filters.courseTypeId === 3) return courseTypeTotals.basic ?? paginationInfo.totalCount ?? 0;
    if (filters.courseTypeId === 2) return courseTypeTotals.intermediate ?? paginationInfo.totalCount ?? 0;
    if (filters.courseTypeId === 1) return courseTypeTotals.advanced ?? paginationInfo.totalCount ?? 0;
    return paginationInfo.totalCount ?? 0;
  }, [courseTypeTotals.advanced, courseTypeTotals.basic, courseTypeTotals.intermediate, filters.courseTypeId, paginationInfo.totalCount]);
  useEffect(() => {
    const fetchDropdownData = async () => {
      setDropdownLoading(prev => ({ ...prev, subcategories: true }));
      try {
        const data = await getAllSubcategories();
        let subcategories = [];
        
        // Handle different response structures
        if (data && data.items && Array.isArray(data.items)) {
          subcategories = data.items;
        } else if (data && Array.isArray(data)) {
          subcategories = data;
        } else if (data && data.data && Array.isArray(data.data)) {
          subcategories = data.data;
        }
        
        setSubcategories(subcategories);
        setDropdownError(prev => ({ ...prev, subcategories: '' }));
      } catch (err) {
        console.error('Failed to fetch subcategories:', err);
        setDropdownError(prev => ({ ...prev, subcategories: 'Failed to load subcategories' }));
        setSubcategories([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, subcategories: false }));
      }

      // Fetch Course Types
      setDropdownLoading(prev => ({ ...prev, courseTypes: true }));
      try {
        const data = await getCourseTypes();
        setCourseTypes(data);
        setDropdownError(prev => ({ ...prev, courseTypes: '' }));
      } catch (error) {
        setDropdownError(prev => ({ ...prev, courseTypes: 'Failed to load course types' }));
      } finally {
        setDropdownLoading(prev => ({ ...prev, courseTypes: false }));
      }

      // Fetch Course Levels
      setDropdownLoading(prev => ({ ...prev, courseLevels: true }));
      try {
        const data = await getCourseLevels();
        setCourseLevels(data);
        setDropdownError(prev => ({ ...prev, courseLevels: '' }));
      } catch (error) {
        setDropdownError(prev => ({ ...prev, courseLevels: 'Failed to load course levels' }));
      } finally {
        setDropdownLoading(prev => ({ ...prev, courseLevels: false }));
      }

      // Fetch Course Topics
      setDropdownLoading(prev => ({ ...prev, courseTopics: true }));
      try {
        const data = await getCourseTopics();
        const topicsData = data.items || data || [];
        setCourseTopics(Array.isArray(topicsData) ? topicsData : []);
        setDropdownError(prev => ({ ...prev, courseTopics: '' }));
      } catch (error) {
        setDropdownError(prev => ({ ...prev, courseTopics: 'Failed to load course topics' }));
        setCourseTopics([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, courseTopics: false }));
      }

      // Fetch Badges
      setDropdownLoading(prev => ({ ...prev, badges: true }));
      try {
        const response = await getAllCourseBadgesNew();
        // Handle the API response structure where badges are in items array
        const badgesData = response.items || response || [];
        const transformedBadges = Array.isArray(badgesData) ? badgesData.map(badge => ({
          id: badge.id,
          name: badge.badgeName,
          description: badge.description
        })) : [];
        setBadges(transformedBadges);
        setDropdownError(prev => ({ ...prev, badges: '' }));
      } catch (error) {
        setDropdownError(prev => ({ ...prev, badges: 'Failed to load badges' }));
      } finally {
        setDropdownLoading(prev => ({ ...prev, badges: false }));
      }

      // Fetch Course Skills
      setDropdownLoading(prev => ({ ...prev, courseSkills: true }));
      try {
        const data = await getAllSkills();
        const skillsData = data.items || data || [];
        setCourseSkills(Array.isArray(skillsData) ? skillsData : []);
        setDropdownError(prev => ({ ...prev, courseSkills: '' }));
      } catch (error) {
        setDropdownError(prev => ({ ...prev, courseSkills: 'Failed to load course skills' }));
        setCourseSkills([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, courseSkills: false }));
      }
    };

    fetchDropdownData();
  }, [getAllSubcategories, getCourseTypes, getCourseLevels, getCourseTopics, getAllCourseBadgesNew, getAllSkills]);

  // Handle view details
 const handleViewDetails = useCallback(async (course) => {
    // Handle both course object and courseId parameter
    const courseId = typeof course === 'object' ? course.id : course;
    
    if (!courseId) {
      return;
    }
    
    // Toggle expansion
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));

    // Fetch details if not already loaded and row is being expanded
    if (!expandedCourses[courseId] && !courseDetails[courseId]) {
      try {
        setDetailsLoading(prev => ({ ...prev, [courseId]: true }));
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
        });
        
        const courseDetailData = await Promise.race([
          getCourseById(courseId),
          timeoutPromise
        ]);
        
        setCourseDetails(prev => ({
          ...prev,
          [courseId]: courseDetailData
        }));
      } catch (error) {
        // Clear loading state on error
        setDetailsLoading(prev => ({ ...prev, [courseId]: false }));
        // Show error toast
        showToast(error.message === 'Request timeout' ? 'Request timed out. Please try again.' : 'Failed to load course details', 'error');
      } finally {
        // Always clear loading state
        setDetailsLoading(prev => ({ ...prev, [courseId]: false }));
      }
    }
  }, [getCourseById, showToast, expandedCourses, courseDetails]);

  // Handle toggle expand for universal table
  const handleToggleExpand = (courseOrId) => {
    // Handle both course object and courseId parameter
    const courseId = typeof courseOrId === 'object' ? courseOrId.id : courseOrId;
    
    if (!courseId) {
      return;
    }
    
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Handle accordion toggle for professional hierarchy
  const handleAccordionToggle = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Handle edit course
  const handleEditCourse = async (course) => {
    try {
      setModalLoading(true);
      setModalError('');
      
      const courseDetailData = await getCourseById(course.id);
      
      // Open modal with course data
      openModal('edit', {
        ...course,
        ...courseDetailData,
        badgeIds: courseDetailData.badges?.map(badge => badge.id) || []
      });
    } catch (error) {
      setModalError('Failed to load course details for editing');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle modal submission
  const handleModalSubmit = async (formData, isFormData = false) => {
    try {
      setModalLoading(true);
      setModalError('');

      if (modalState.mode === 'create') {
        if (isFormData) {
          // formData is already FormData, use it directly
          await createCourseWithFile(formData);
        } else {
          // Convert JSON to FormData for consistency
          const convertedFormData = new FormData();
          
          // Add all fields to FormData (using lowercase field names like JSON)
          if (formData.title) convertedFormData.append('title', formData.title);
          if (formData.subtitle) convertedFormData.append('subtitle', formData.subtitle);
          if (formData.description) convertedFormData.append('description', formData.description);
          if (formData.overview) convertedFormData.append('overview', formData.overview);
          if (formData.languageCode) convertedFormData.append('languageCode', formData.languageCode);
          if (formData.courseTypeId !== undefined) convertedFormData.append('courseTypeId', parseInt(formData.courseTypeId));
          if (formData.categoryId !== undefined) convertedFormData.append('categoryId', parseInt(formData.categoryId));
          if (formData.courseLevelId !== undefined) convertedFormData.append('courseLevelId', parseInt(formData.courseLevelId));
          if (formData.isPaid !== undefined) convertedFormData.append('isPaid', formData.isPaid);
          if (formData.price !== undefined) convertedFormData.append('price', parseFloat(formData.price) || 0);
          if (formData.discountedPrice !== undefined) convertedFormData.append('discountedPrice', parseFloat(formData.discountedPrice) || 0);
          if (formData.currencyCode) convertedFormData.append('currencyCode', formData.currencyCode);
          if (formData.altTextImage) convertedFormData.append('altTextImage', formData.altTextImage);
          if (formData.promoVideoUrl) convertedFormData.append('promoVideoUrl', formData.promoVideoUrl);
          
          // Add badges array (always include, even if empty)
          if (formData.badgeIds && formData.badgeIds.length > 0) {
            formData.badgeIds.forEach((badgeId, index) => {
              convertedFormData.append(`badgeIds[${index}]`, parseInt(badgeId));
            });
          } else {
            // Don't send badgeIds at all if empty to avoid validation error
            // convertedFormData.append('badgeIds', JSON.stringify([]));
          }
          
          // Add courseSkills array (always include, even if empty)
          if (formData.courseSkillIds && formData.courseSkillIds.length > 0) {
            formData.courseSkillIds.forEach((skillId, index) => {
              convertedFormData.append(`courseSkillIds[${index}]`, parseInt(skillId));
            });
          } else {
            // Don't send courseSkillIds at all if empty to avoid validation error
            // convertedFormData.append('courseSkillIds', JSON.stringify([]));
          }
          
          // Add sections array (always include, even if empty)
          if (formData.sections && formData.sections.length > 0) {
            formData.sections.forEach((section, index) => {
              convertedFormData.append(`sections[${index}].moduleName`, section.moduleName || '');
              convertedFormData.append(`sections[${index}].title`, section.title || '');
              convertedFormData.append(`sections[${index}].description`, section.description || '');
              convertedFormData.append(`sections[${index}].sortOrder`, section.sortOrder || index);
              
              // Add lectures for this section
              if (section.lectures && section.lectures.length > 0) {
                section.lectures.forEach((lecture, lectureIndex) => {
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].title`, lecture.title || '');
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].lectureType`, lecture.lectureType || 1);
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].isFreePreview`, lecture.isFreePreview || false);
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].sortOrder`, lecture.sortOrder || lectureIndex);
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].lmscourseMappingId`, lecture.lmscourseMappingId || lecture.id);
                });
              }
            });
          }
          
          // Add directLectures array (always include, even if empty)
          if (formData.directLectures && formData.directLectures.length > 0) {
            formData.directLectures.forEach((lecture, index) => {
              convertedFormData.append(`directLectures[${index}].title`, lecture.title || '');
              convertedFormData.append(`directLectures[${index}].lectureType`, lecture.lectureType || 1);
              convertedFormData.append(`directLectures[${index}].isFreePreview`, lecture.isFreePreview || false);
              convertedFormData.append(`directLectures[${index}].sortOrder`, lecture.sortOrder || index);
              convertedFormData.append(`directLectures[${index}].lmscourseMappingId`, lecture.lmscourseMappingId || lecture.id);
            });
          }
          
          await createCourseWithFile(convertedFormData);
        }
        showToast('Course created successfully!', 'success');
      } else if (modalState.mode === 'edit') {
        if (isFormData) {
          // formData is already FormData, use it directly
          await updateCourseWithFile(modalState.course.id, formData);
        } else {
          // Convert JSON to FormData for consistency
          const convertedFormData = new FormData();
          
          // Add all fields to FormData (using lowercase field names like JSON)
          if (formData.title) convertedFormData.append('title', formData.title);
          if (formData.subtitle) convertedFormData.append('subtitle', formData.subtitle);
          if (formData.description) convertedFormData.append('description', formData.description);
          if (formData.overview) convertedFormData.append('overview', formData.overview);
          if (formData.languageCode) convertedFormData.append('languageCode', formData.languageCode);
          if (formData.courseTypeId !== undefined) convertedFormData.append('courseTypeId', parseInt(formData.courseTypeId));
          if (formData.categoryId !== undefined) convertedFormData.append('categoryId', parseInt(formData.categoryId));
          if (formData.courseLevelId !== undefined) convertedFormData.append('courseLevelId', parseInt(formData.courseLevelId));
          if (formData.isPaid !== undefined) convertedFormData.append('isPaid', formData.isPaid);
          if (formData.price !== undefined) convertedFormData.append('price', parseFloat(formData.price) || 0);
          if (formData.discountedPrice !== undefined) convertedFormData.append('discountedPrice', parseFloat(formData.discountedPrice) || 0);
          if (formData.currencyCode) convertedFormData.append('currencyCode', formData.currencyCode);
          if (formData.altTextImage) convertedFormData.append('altTextImage', formData.altTextImage);
          if (formData.promoVideoUrl) convertedFormData.append('promoVideoUrl', formData.promoVideoUrl);
          
          // Add badges array (always include, even if empty)
          if (formData.badgeIds && formData.badgeIds.length > 0) {
            formData.badgeIds.forEach((badgeId, index) => {
              convertedFormData.append(`badgeIds[${index}]`, parseInt(badgeId));
            });
          } else {
            // Don't send badgeIds at all if empty to avoid validation error
            // convertedFormData.append('badgeIds', JSON.stringify([]));
          }
          
          // Add courseSkills array (always include, even if empty)
          if (formData.courseSkillIds && formData.courseSkillIds.length > 0) {
            formData.courseSkillIds.forEach((skillId, index) => {
              convertedFormData.append(`courseSkillIds[${index}]`, parseInt(skillId));
            });
          } else {
            // Don't send courseSkillIds at all if empty to avoid validation error
            // convertedFormData.append('courseSkillIds', JSON.stringify([]));
          }
          
          // Add sections array (always include, even if empty)
          if (formData.sections && formData.sections.length > 0) {
            formData.sections.forEach((section, index) => {
              convertedFormData.append(`sections[${index}].moduleName`, section.moduleName || '');
              convertedFormData.append(`sections[${index}].title`, section.title || '');
              convertedFormData.append(`sections[${index}].description`, section.description || '');
              convertedFormData.append(`sections[${index}].sortOrder`, section.sortOrder || index);
              
              // Add lectures for this section
              if (section.lectures && section.lectures.length > 0) {
                section.lectures.forEach((lecture, lectureIndex) => {
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].title`, lecture.title || '');
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].lectureType`, lecture.lectureType || 1);
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].isFreePreview`, lecture.isFreePreview || false);
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].sortOrder`, lecture.sortOrder || lectureIndex);
                  convertedFormData.append(`sections[${index}].lectures[${lectureIndex}].lmscourseMappingId`, lecture.lmscourseMappingId || lecture.id);
                });
              }
            });
          }
          
          // Add directLectures array (always include, even if empty)
          if (formData.directLectures && formData.directLectures.length > 0) {
            formData.directLectures.forEach((lecture, index) => {
              convertedFormData.append(`directLectures[${index}].title`, lecture.title || '');
              convertedFormData.append(`directLectures[${index}].lectureType`, lecture.lectureType || 1);
              convertedFormData.append(`directLectures[${index}].isFreePreview`, lecture.isFreePreview || false);
              convertedFormData.append(`directLectures[${index}].sortOrder`, lecture.sortOrder || index);
              convertedFormData.append(`directLectures[${index}].lmscourseMappingId`, lecture.lmscourseMappingId || lecture.id);
            });
          }
          
          await updateCourseWithFile(modalState.course.id, convertedFormData);
        }
        showToast('Course updated successfully!', 'success');
      } else if (modalState.mode === 'delete') {
        await deleteCourse(modalState.course.id);
        showToast('Course deleted successfully!', 'success');
      }

      // Refresh course data
      await applyFilters();
      closeModal();
    } catch (error) {
      setModalError(error.response?.data || error.message || `Failed to ${modalState.mode} course`);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete course
  const handleDeleteCourse = (course) => {
    openModal('delete', course);
  };

  // Handle CSV upload
  const handleCsvUpload = async (formData, isFormData = false) => {
    try {
      setCsvModalLoading(true);
      setCsvModalError('');
      
      await uploadCourseCsv(formData);
      showToast('Short courses created successfully from CSV!', 'success');
      setCsvModalOpen(false);
      
      // Refresh course data
      await applyFilters();
    } catch (error) {
      setCsvModalError(error.response?.data || error.message || 'Failed to upload CSV file');
    } finally {
      setCsvModalLoading(false);
    }
  };

  // Handle regenerate course content
  const handleRegenerateContent = async () => {
    if (!modalState.course?.id || !regeneratePrompt.trim()) {
      setPromptError('Please provide a prompt to regenerate content');
      return;
    }

    try {
      setModalLoading(true);
      setModalError('');
      setPromptError('');
      
      await generateCourseContent(modalState.course.id, regeneratePrompt.trim());
      
      showToast('Course content regenerated successfully!', 'success');
      closeModal();
      setRegeneratePrompt('');
      setPromptError('');
      
      // Refresh course data
      await applyFilters();
    } catch (error) {
      setModalError(error.response?.data || error.message || 'Failed to regenerate course content');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle remove thumbnail
  const handleRemoveThumbnail = async (course) => {
    if (window.confirm(`Are you sure you want to remove the thumbnail for "${course.title}"? This will also regenerate the thumbnail.`)) {
      try {
        await removeThumbnail(course.id);
        showToast('Thumbnail removed and will be regenerated successfully!', 'success');
        // Refresh course data to show updated thumbnail
        await applyFilters();
      } catch (error) {
        showToast(error.message || 'Failed to remove thumbnail', 'error');
      }
    }
  };

  // Handle custom actions
  const handleCustomAction = (actionKey, item) => {
    if (actionKey === 'content') {
      if(item.courseDetailLectureId && item.courseTypeId === 3) {
        navigate(`/admin/course-content/${item.courseDetailLectureId}`);
      }
    } else if (actionKey === 'regenerate') {
      if(item.courseDetailLectureId && item.courseTypeId === 3) {
        openModal('regenerate', item);
      }
    } else if (actionKey === 'remove-thumbnail') {
      handleRemoveThumbnail(item);
    }
  };

  // Apply filters with optimized loading state
  const applyFilters = useCallback(async (overrideFilters) => {
  if (filtersLoading) {
    return;
  }

    setFiltersLoading(true);
    try {
      const effectiveFilters = overrideFilters || filters;
      // If no overrideFilters provided, reset page to 1
      if (!overrideFilters) {
        effectiveFilters.page = 1;
      }
      const activeFilters = Object.fromEntries(
        Object.entries(effectiveFilters).filter(([key, value]) => {
          // Always include page and pageSize regardless of their value
          if (key === 'page' || key === 'pageSize') return true;
          // For other fields, filter out empty/falsy values
          return value !== '' && value !== 0 && value !== null && value !== undefined;
        })
      );


      const coursesData = await getAllCoursesAdmin(activeFilters);

      const coursesArray = coursesData?.items || coursesData?.data || coursesData || [];

      setFilteredCourses(coursesArray);

      setCourseTypeTotals({
        basic: coursesData?.totalBasicCount,
        intermediate: coursesData?.totalIntermediateCount,
        advanced: coursesData?.totalAdvanceCount
      });

      // Update pagination info from response
      if (coursesData?.page !== undefined) {
        setPaginationInfo({
          page: coursesData.page,
          pageSize: coursesData.pageSize,
          totalCount: coursesData.totalCount || coursesArray.length
        });
      }
    } catch (error) {
      console.error('applyFilters error:', error);
      showToast('Failed to apply filters', 'error');
    } finally {
      setFiltersLoading(false);
    }
  }, [filtersLoading, filters, getAllCoursesAdmin, showToast, setCourseTypeTotals, setFiltersLoading, setFilteredCourses, setPaginationInfo]);
  const handlePageChange = useCallback(async (newPage) => {
    if (newPage < 1) return;
    
    const updatedFilters = { ...filters, page: newPage };
    setFilters(updatedFilters);

    await applyFilters(updatedFilters);
  }, [applyFilters, filters, setFilters]);

  const handlePageSizeChange = useCallback(async (newPageSize) => {
    const updatedFilters = {
      ...filters,
      page: 1,
      pageSize: newPageSize
    };

    setFilters(updatedFilters);
    setPaginationInfo(prev => ({ ...prev, page: 1, pageSize: newPageSize }));
    await applyFilters(updatedFilters);
  }, [applyFilters, filters, setFilters, setPaginationInfo]);

  // Load filtered courses on component mount and when filters change
  useEffect(() => {
    applyFilters();
   
  }, []); // Only run on mount

  if (error && !modalState.isOpen && !csvModalOpen && modalState.mode === null) {
    return (
      <AdminPageLayout
        title="Course Management"
        subtitle="Manage and monitor all your courses in one place"
        icon={BookOpen}
        loading={false}
        skeletonType="table"
      >
        <div className="text-red-500 p-4">{error}</div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title="Course Management"
      subtitle="Manage and monitor all your courses in one place"
      icon={BookOpen}
      loading={false}
      skeletonType="table"
      stats={statsCards}
      actions={
        <>
          <div className="relative w-full sm:w-72 lg:w-80">
            
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className={`flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
              (filtersExpanded || searchTerm) 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {(filtersExpanded || searchTerm) && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-full">
                Active
              </span>
            )}
          </button>
          <button 
            onClick={() => openModal('create')}
            className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-sm"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Course</span>
            <span className="sm:hidden">Create</span>
          </button>
          {filters.courseTypeId === 3 && (
            <button 
              onClick={() => setCsvModalOpen(true)}
              className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 dark:hover:from-green-600 dark:hover:to-emerald-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-sm"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">CSV Upload</span>
              <span className="sm:hidden">CSV</span>
            </button>
          )}
        </>
      }
    >
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Filters Section */}
      {filtersExpanded && (
        <div className="relative z-10">
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
          <div className="py-2 sm:py-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-end mb-2">
              <button
                onClick={() => {
                  setSearchTerm(''); // Clear search term when applying filters
                  setFilters({ ...filters, page: 1 }); // Reset to page 1
                  applyFilters();
                }}

                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-xs"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={filters.title}
                  onChange={(e) => handleFilterChange('title', e.target.value)}
                  placeholder="Search by title..."
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <CategoryDropdown
                  categories={subcategories}
                  value={filters.categoryId}
                  onChange={(categoryId) => handleFilterChange('categoryId', categoryId)}
                  placeholder="Select category..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Is Paid</label>
                <select
                  value={filters.isPaid}
                  onChange={(e) => handleFilterChange('isPaid', e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-xs"
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
         
          </div>
        </div>
        </div>
      )}
      <div className="mt-6 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="p-2 sm:p-4">
          <UniversalVirtualizedTable
            data={searchFilteredCourses}
            columns={courseTableColumns}
            onEdit={handleEditCourse}
            onDelete={handleDeleteCourse}
            onViewDetails={handleViewDetails}
            onToggleExpand={handleToggleExpand}
            onCustomAction={handleCustomAction}
            expandedItems={expandedCourses}
            itemDetails={courseDetails}
            detailsLoading={detailsLoading}
            loading={filtersLoading}
            searchTerm={debouncedSearchTerm}
            itemHeight={COURSE_MANAGEMENT_CONSTANTS.ITEM_HEIGHT}
            containerHeight={COURSE_MANAGEMENT_CONSTANTS.CONTAINER_HEIGHT}
            bufferSize={15}
            expandable={true}
            renderExpandedContent={(course, details) => (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            {/* Course Header with Thumbnail and Basic Info */}
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div className="relative flex-shrink-0">
                {details?.thumbnailUrl || course?.thumbnailUrl ? (
                  <div className="relative overflow-hidden rounded-lg shadow-md">
                    <img 
                      src={details?.thumbnailUrl || course?.thumbnailUrl} 
                      alt={details?.title || course?.title}
                      className="w-24 h-24 object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <Image className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              
              {/* Course Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {details?.title || course?.title || 'Untitled Course'}
                    </h4>
                    {details?.subtitle && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{details.subtitle}</p>
                    )}
                    {(details?.altTextImage || course?.altTextImage) && (
                      <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <Image className="w-3 h-3 mr-1" />
                        <span className="font-medium">Alt Text:</span>
                        <span className="ml-1">{details?.altTextImage || course?.altTextImage}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Rating Badge */}
                  {(details?.averageRating > 0 || details?.totalReviews > 0) && (
                    <div className="flex-shrink-0 ml-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                          {details?.averageRating?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                        {details?.totalReviews || 0} reviews
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Tags Row */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Course Type */}
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    <Layers className="w-3 h-3 mr-1" />
                    {details?.courseTypeName || course?.courseTypeName || 'Unknown Type'}
                  </div>
                  {/* Category */}
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {details?.categoryName || course?.categoryName || 'Unknown'}
                  </div>
                  {/* Sub Category */}
                  {details?.subCategoryName && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200">
                      <Tag className="w-3 h-3 mr-1" />
                      {details.subCategoryName}
                    </div>
                  )}
                  {/* Course Level */}
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                    <Globe className="w-3 h-3 mr-1" />
                    {details?.courseLevelTitle || details?.courseLevelName || course?.courseLevelName || 'Unknown'}
                  </div>
                  {/* Language */}
                  {details?.languageCode && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {details.languageCode.toUpperCase()}
                    </div>
                  )}
                  {/* Badges */}
                  {details?.badges?.map((badge, index) => (
                    <div key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                      <Award className="w-3 h-3 mr-1" />
                      {badge?.badgeName}
                    </div>
                  ))}
                </div>

                {/* Pricing Info */}
                <div className="flex items-center gap-4">
                  {details?.isPaid || course?.isPaid ? (
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {details?.currencyCode || 'USD'} {details?.discountedPrice ?.toFixed(2) || course?.price?.toFixed(2) || '0.00'}
                      </div>
                      {details?.discountedPrice && details.discountedPrice < details.price && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 line-through">
                            {details.currencyCode || 'USD'} {details.price?.toFixed(2)}
                          </span>
                        
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      <Users className="w-4 h-4 mr-1" />
                      Free Course
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Grid - Description & Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Description Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mr-2">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h5 className="text-sm font-bold text-gray-900 dark:text-white">Description</h5>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                  {details?.description || course?.description || 'No description available'}
                </p>
              </div>
              
              {/* Overview Card */}
              {details?.overview && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-2">
                      <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">Overview</h5>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                    {details.overview}
                  </p>
                </div>
              )}
            </div>

            {/* Lecture Video - Only for Short Courses */}
            {(details?.promoVideoUrl || course?.promoVideoUrl) && (details?.courseTypeId === 3 || course?.courseTypeId === 3 || course?.courseTypeID === 3) && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-2">
                    <Video className="w-4 h-4 text-white" />
                  </div>
                  <h5 className="text-sm font-bold text-gray-900 dark:text-white">Lecture Video</h5>
                </div>
                <div className="w-80 h-48">
                  <video
                    src={details?.promoVideoUrl || course?.promoVideoUrl}
                    className="w-full h-full rounded-lg shadow-md object-contain bg-black"
                    controls
                    preload="metadata"
                  />
                </div>
              </div>
            )}

            {/* Course Sections with Lectures */}
            {(details?.sections?.length > 0 || course?.sections?.length > 0) && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-2">
                      <Layers className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-900 dark:text-white">Course Sections</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {details?.sections?.length || course?.sections?.length || 0} sections
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(details?.sections || course?.sections || []).map((section, sectionIndex) => (
                    <div key={section.id || sectionIndex} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                      {/* Section Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{sectionIndex + 1}</span>
                          </div>
                          <div>
                            <h6 className="text-sm font-bold text-gray-900 dark:text-white">
                              {section.title || `Section ${sectionIndex + 1}`}
                            </h6>
                            {section.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{section.description}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full">
                          {section.lectures?.length || 0} lectures
                        </span>
                      </div>
                       
                      {/* Section Lectures */}
                      {section.lectures?.length > 0 && (
                        <div className="ml-11 space-y-2">
                          {section.lectures.map((lecture, lectureIndex) => (
                            <div key={lecture.id || lectureIndex} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2">
                                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Play className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {lecture.title}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {lecture.lmsContent?.lectureDescription || 'No description available'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {lecture.lectureType || 'video'}
                                      </span>
                                      {lecture.isFreePreview && (
                                        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded">
                                          Free Preview
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Professional Certificate Hierarchy */}
            {(details?.professionalHierarchy?.sections?.length > 0 || course?.professionalHierarchy?.sections?.length > 0) && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-2">
                      <Layers className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-900 dark:text-white">Professional Certificate Structure</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(details?.professionalHierarchy?.sections || course?.professionalHierarchy?.sections || []).length} certificates
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(details?.professionalHierarchy?.sections || course?.professionalHierarchy?.sections || []).map((section, sectionIndex) => (
                    <div key={section.courseCertificateId || sectionIndex} className="bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-700">
                      {/* Certificate Header - Clickable to Expand/Collapse */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => handleAccordionToggle(section.courseCertificateId)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-6 h-6">
                            {expandedSections[section.courseCertificateId] ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                          <div>
                            <h6 className="text-sm font-bold text-gray-900 dark:text-white">
                              {section.courseCertificateTitle}
                            </h6>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {section.shortCourses?.length || 0} short courses
                            </p>
                          </div>
                        </div>
                        
                        {/* Delete Button - Only on parent certificate */}
                        {/* <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse({ id: section.courseCertificateId, title: section.courseCertificateTitle });
                          }}
                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Delete Certificate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button> */}
                      </div>
                      
                      {/* Short Courses - Nested Accordion Content */}
                      {expandedSections[section.courseCertificateId] && section.shortCourses?.length > 0 && (
                        <div className="px-4 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-700">
                          {section.shortCourses.map((shortCourse, shortCourseIndex) => (
                            <div key={shortCourse.shortCourseId || shortCourseIndex} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                              <div className="flex items-start space-x-2">
                                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <BookOpen className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {shortCourse.shortCourseTitle}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Short Course ID: {shortCourse.shortCourseId}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Lectures (for courses without sections) */}
            {(details?.directLectures?.length > 0 || course?.directLectures?.length > 0) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-2">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-900 dark:text-white">Course Lectures</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {details?.directLectures?.length || course?.directLectures?.length || 0} lectures
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(details?.directLectures || course?.directLectures || []).map((lecture, lectureIndex) => (
                    <div key={lecture.id || lectureIndex} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Play className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {lecture.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {lecture.lmsContent?.lectureDescription || 'No description available'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {lecture.lectureType || 'video'}
                              </span>
                              {lecture.isFreePreview && (
                                <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded">
                                  Free Preview
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Reviews */}
            {details?.reviews?.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mr-2">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-900 dark:text-white">Course Reviews</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {details.reviews.length} reviews • Average: {details.averageRating?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {details.reviews.map((review, index) => (
                    <div key={review.id || index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
                            />
                          ))}
                          <span className="ml-2 text-sm font-bold text-gray-900 dark:text-white">{review.rating}/5</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Unknown date'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {review.reviewText}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
            emptyMessage="No courses found"
            loadingMessage="Loading courses..."
          />
        </div>

        {/* Enhanced Pagination */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 sm:mb-0">
              <span className="font-medium text-gray-900 dark:text-white">{searchFilteredCourses?.length || 0}</span> of{' '}
              <span className="font-medium text-gray-900 dark:text-white">{displayTotalCount}</span> courses
              {searchTerm && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  (filtered)
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Page size</span>
                <select
                  value={paginationInfo.pageSize}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
                  className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(paginationInfo.page - 1)}
                  disabled={paginationInfo.page === 1}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    paginationInfo.page === 1 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <ChevronDown className="w-4 h-4 rotate-90" />
                    <span>Previous</span>
                  </div>
                </button>
                
                <div className="flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl font-medium">
                  <span>Page {paginationInfo.page}</span>
                </div>
                
                <button
                  onClick={() => handlePageChange(paginationInfo.page + 1)}
                  disabled={(paginationInfo.page * paginationInfo.pageSize) >= displayTotalCount}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    (paginationInfo.page * paginationInfo.pageSize) >= displayTotalCount
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <span>Next</span>
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Course Modal */}
      <CourseModal
        isOpen={modalState.isOpen && modalState.mode !== 'regenerate'}
        onClose={handleCloseModal}
        mode={modalState.mode}
        course={modalState.course}
        categories={subcategories}
        courseLevels={courseLevels}
        courseTypes={courseTypes}
        courseTopics={courseTopics}
        courseSkills={courseSkills}
        badges={badges}
        loading={modalState.loading}
        error={modalState.error}
        onSubmit={handleModalSubmit}
        dropdownLoading={dropdownLoading}
        dropdownError={dropdownError}
        onClearError={() => setModalError('')}
      />

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSubmit={handleCsvUpload}
        loading={csvModalLoading}
        csvError={csvModalError}
        onClearError={() => setCsvModalError('')}
      />

      {/* Regenerate Course Modal */}
      {modalState.mode === 'regenerate' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={handleCloseModal}
            />

            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Regenerate Course Content
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enter a prompt to regenerate the content for course: <strong>{modalState.course?.title}</strong>
                </p>
                
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Regeneration Prompt
                </label>
                <textarea
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    promptError 
                      ? 'border-red-500 dark:border-red-400 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  rows={4}
                  placeholder="Enter your prompt to regenerate course content..."
                  value={regeneratePrompt}
                  onChange={(e) => {
                    setRegeneratePrompt(e.target.value);
                    if (promptError) setPromptError('');
                  }}
                  required
                />
                {promptError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {promptError}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerateContent}
                  disabled={modalState.loading}
                  className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
                >
                  {modalState.loading ? 'Regenerating...' : 'Regenerate Content'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminPageLayout>
  );
};

export default CourseManagement;
