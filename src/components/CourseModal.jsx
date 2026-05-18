import  { useState, useEffect } from 'react';
import {
  XCircle,
  Trash2,
  Plus,
  Save,
  DollarSign,
  Image,
  BookOpen,
  Upload
} from 'lucide-react';

import GenericDropdown from './GenericDropdown';
import MultiSelectDropdown from './MultiSelectDropdown';
import CategoryDropdown from './CategoryDropdown';
import LmsLecturesDropdown from './LmsLecturesDropdown';
import SelectedLecturesTable from './SelectedLecturesTable';
import ConfirmationModal from './ConfirmationModal';

const CourseModal = ({
  isOpen,
  onClose,
  mode, 
  course, 
  categories,
  courseTypes,
  courseLevels,
  courseTopics,
  courseSkills,
  badges,
  loading,
  error,
  onSubmit,
  dropdownLoading,
  dropdownError,
  onClearError
}) => {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    overview: '',
    languageCode: 'EN',
    courseTypeId: 0,
    courseLevelId: 0,
    courseTopicIds: [],
    courseSkillIds: [],
    categoryId: 0,
    isPaid: true,
    price: '',
    discountedPrice: '',
    currencyCode: 'USD',
    thumbnailUrl: '',
    promoVideoUrl: '',
    promoVideoDurationSeconds: 0,
    promoVideoDurationText: '',
    badgeIds: [],
    mapExistingLectures: false,
    mappedLectures: [],
    sections: [],
    thumbnailFile: null,
    promoVideoFile: null,
    instructionForCourseCreation: ''
}, [course, mode]);

  // Calculate video duration from existing URL when editing a short course
  useEffect(() => {
    const calculateDurationFromUrl = async () => {
      if (
        mode === 'edit' && 
        course && 
        Number(course.courseTypeId) === 3 && 
        course.promoVideoUrl && 
        !course.promoVideoDurationSeconds &&
        formData.promoVideoUrl &&
        !formData.promoVideoDurationSeconds
      ) {
        try {
          const durationInSeconds = await getVideoDurationFromUrl(formData.promoVideoUrl);
          const durationText = formatDuration(durationInSeconds);
          
          setFormData(prev => ({
            ...prev,
            promoVideoDurationSeconds: Math.round(durationInSeconds),
            promoVideoDurationText: durationText
          }));
        } catch (error) {
          console.error('Error calculating video duration from URL:', error);
          // Don't update if calculation fails
        }
      }
    };

    calculateDurationFromUrl();
  }, [mode, course, formData.promoVideoUrl]);

  const courseTypeIdNumber = Number(formData.courseTypeId);
  const shouldShowExistingCreationCheckbox = courseTypeIdNumber !== 1 && courseTypeIdNumber !== 2 && (mode === 'create' || course?.isNew === false);
  const shouldShowLectureMapping =
    (courseTypeIdNumber === 1 || courseTypeIdNumber === 2)
      ? courseTypeIdNumber > 0
      : courseTypeIdNumber === 3 
        ? formData.mapExistingLectures === true && courseTypeIdNumber > 0
        : formData.mapExistingLectures === true && courseTypeIdNumber > 0;

  const [formErrors, setFormErrors] = useState({});

  // State to track if modal is closing
  const [isClosing, setIsClosing] = useState(false);

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: null
  });

  useEffect(() => {
    if (course && mode === 'edit') {
      const existingLectures = (course.directLectures || course.courseDetails || [])
        .map((lecture) => {
          const mappingId = lecture.lmscourseMappingId || lecture.lmsCourseMappingId || lecture.id;
          const normalizedLectureType = Number(lecture.lectureType) || 1;
          const lectureSourceType = Number(lecture.lectureSourceType);
          const normalizedSource =
            lectureSourceType === 1
              ? 'LMS'
              : lecture.internalLectureId
                ? 'COURSE'
                : 'INTERNAL';

          const lmsContent = lecture.lmsContent;
          return {
            id: mappingId,
            title: lecture.title || lmsContent?.lmsLectureName || lecture.lmsLectureName || '',
            source: lecture.source || normalizedSource,
            lectureType: normalizedLectureType,
            isFreePreview: lecture.isFreePreview || false,
            sortOrder: lecture.sortOrder || 0,
            lmscourseMappingId: mappingId,
            displayName: lecture.displayName || lecture.title || lmsContent?.lmsLectureName || lecture.lmsLectureName,
            lmsCourseId: lmsContent?.lmsCourseId ?? lecture.lmsCourseId,
            lmsCourseName: lmsContent?.lmsCourseName || lecture.lmsCourseName || '',
            lmsModuleId: lmsContent?.lmsModuleId ?? lecture.lmsModuleId,
            lmsModuleName: lmsContent?.lmsModuleName || lecture.lmsModuleName || '',
            lmsSubjectId: lmsContent?.lmsSubjectId ?? lecture.lmsSubjectId,
            lmsSubjectName: lmsContent?.lmsSubjectName || lecture.lmsSubjectName,
            lmsLectureId: lmsContent?.lmsLectureId ?? lecture.lmsLectureId,
            lmsLectureName: lmsContent?.lmsLectureName || lecture.lmsLectureName || lecture.title,
            lectureOverview: lmsContent?.lectureOverview ?? lecture.lectureOverview,
            lectureDescription: lmsContent?.lectureDescription ?? lecture.lectureDescription,
            tags: lmsContent?.tags || lecture.tags
          };
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const existingShortCourses = (course.shortCourses || [])
        .map((shortCourse, index) => {
          const courseId = shortCourse.shortCourseId || shortCourse.courseId || shortCourse.id;
          return {
            id: courseId,
            title: shortCourse.shortCourseTitle || shortCourse.title || '',
            source: 'COURSE',
            itemType: 'SHORT_COURSE',
            lectureType: 1,
            isFreePreview: false,
            sortOrder: index,
            lmscourseMappingId: courseId,
            displayName: shortCourse.shortCourseTitle || shortCourse.title || ''
          };
        });

      const mappedLecturesResolved = (() => {
        if (Number(course.courseTypeId) === 1) {
          // For course type 1, only extract certificates from professionalHierarchy
          const hierarchyLectures = [];
          (course.professionalHierarchy?.sections || []).forEach((section) => {
            // Add certificate if exists
            if (section.courseCertificateId) {
              hierarchyLectures.push({
                id: section.courseCertificateId,
                title: section.courseCertificateTitle || '',
                source: 'COURSE',
                itemType: 'CERTIFICATE',
                lectureType: 1,
                isFreePreview: false,
                sortOrder: 0,
                lmscourseMappingId: section.courseCertificateId,
                displayName: section.courseCertificateTitle || ''
              });
            }
            
            // Note: Short courses are intentionally excluded for course type 1
            // Only certificates should be included in the payload
          });
          
          return [...existingLectures, ...hierarchyLectures].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
          );
        } else if (Number(course.courseTypeId) === 2 && existingShortCourses.length > 0) {
          const maxSortOrder = existingLectures.reduce(
            (max, l) => Math.max(max, Number(l.sortOrder ?? 0)),
            0
          );

          const shortCoursesWithOrder = existingShortCourses.map((sc, idx) => ({
            ...sc,
            sortOrder: maxSortOrder + 1 + idx
          }));

          return [...existingLectures, ...shortCoursesWithOrder].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
          );
        }

        return existingLectures;
      })();

      // Process existing sections for Professional Certificate courses
      const existingSections = (course.sections || []).map((section, index) => ({
        id: section.id,
        moduleName: section.moduleName || `Module ${index + 1}`,
        title: section.title || `Section ${index + 1}`,
        description: section.description || '',
        sortOrder: section.sortOrder || index,
        lectures: (section.lectures || []).map((lecture, lectureIndex) => {
          const mappingId = lecture.lmscourseMappingId || lecture.lmsCourseMappingId || lecture.id;
          const normalizedLectureType = Number(lecture.lectureType) || 1;
          const lectureSourceType = Number(lecture.lectureSourceType);
          const normalizedSource =
            lectureSourceType === 1
              ? 'LMS'
              : lecture.internalLectureId
                ? 'COURSE'
                : 'INTERNAL';

          const lmsContent = lecture.lmsContent;
          return {
            id: mappingId,
            title: lecture.title || lmsContent?.lmsLectureName || lecture.lmsLectureName || '',
            source: lecture.source || normalizedSource,
            lectureType: normalizedLectureType,
            isFreePreview: lecture.isFreePreview || false,
            sortOrder: lecture.sortOrder || lectureIndex,
            lmscourseMappingId: mappingId,
            displayName: lecture.displayName || lecture.title || lmsContent?.lmsLectureName || lecture.lmsLectureName,
            lmsCourseId: lmsContent?.lmsCourseId,
            lmsCourseName: lmsContent?.lmsCourseName || '',
            lmsModuleId: lmsContent?.lmsModuleId,
            lmsModuleName: lmsContent?.lmsModuleName || '',
            lmsSubjectId: lmsContent?.lmsSubjectId,
            lmsSubjectName: lmsContent?.lmsSubjectName,
            lmsLectureId: lmsContent?.lmsLectureId,
            lmsLectureName: lmsContent?.lmsLectureName || lecture.lmsLectureName || lecture.title,
            lectureOverview: lmsContent?.lectureOverview,
            lectureDescription: lmsContent?.lectureDescription,
            tags: lmsContent?.tags || []
          };
        })
      }));

      const hierarchySections = (course.professionalHierarchy?.sections || []).map((section, index) => {
        const certificateId = section.courseCertificateId;
        const certificateTitle = section.courseCertificateTitle;

        const lectures = [];
        if (certificateId) {
          lectures.push({
            id: certificateId,
            title: certificateTitle || '',
            source: 'COURSE',
            itemType: 'CERTIFICATE',
            lectureType: 1,
            isFreePreview: false,
            sortOrder: 0,
            lmscourseMappingId: certificateId,
            displayName: certificateTitle || ''
          });
        }

        (section.shortCourses || []).forEach((shortCourse) => {
          const shortId = shortCourse.shortCourseId;
          const shortTitle = shortCourse.shortCourseTitle;
          lectures.push({
            id: shortId,
            title: shortTitle || '',
            source: 'COURSE',
            itemType: 'SHORT_COURSE',
            lectureType: 1,
            isFreePreview: false,
            sortOrder: lectures.length,
            lmscourseMappingId: shortId,
            displayName: shortTitle || ''
          });
        });

        return {
          moduleName: section.sectionTitle || `Module ${index + 1}`,
          title: section.sectionTitle || `Section ${index + 1}`,
          description: '',
          sortOrder: index,
          lectures
        };
      }).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const resolvedSections =
        course.courseTypeId === 1
          ? (
              existingSections.length > 0
                ? existingSections
                : hierarchySections.length > 0
                  ? hierarchySections
                  : [createEmptySection(0)]
            )
          : [];

      setFormData({
        title: course.title || '',
        subtitle: course.subtitle || '',
        description: course.description || '',
        overview: course.overview || '',
        languageCode: course.languageCode || 'EN',
        courseTypeId: course.courseTypeId || 0,
        courseLevelId: course.courseLevelId || 0,
        courseTopicIds: course.courseTopics?.map(topic => topic.id) || [],
        courseSkillIds: course.courseSkills?.map(skill => skill.id) || [],
        categoryId: course.categoryId || 0,
        isPaid: course.isPaid || false,
        price: course.price || '',
        discountedPrice: course.discountedPrice || '',
        currencyCode: course.currencyCode || 'USD',
        thumbnailUrl: course.thumbnailUrl || '',
        promoVideoUrl: course.promoVideoUrl || '',
        promoVideoDurationSeconds: course.promoVideoDurationSeconds || 0,
        promoVideoDurationText: course.promoVideoDurationSeconds ? formatDuration(course.promoVideoDurationSeconds) : (course.promoVideoDurationText || ''),
        badgeIds: course.badgeIds || [],
        mapExistingLectures: Boolean(mappedLecturesResolved.length > 0) || course?.isNew === false,
        mappedLectures: mappedLecturesResolved,
        sections: resolvedSections,
        thumbnailFile: null,
        promoVideoFile: null,
        instructionForCourseCreation: course.instructionForCourseCreation || ''
      });
    } else if (mode === 'create') {
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        overview: '',
        languageCode: 'EN',
        courseTypeId: 0,
        courseLevelId: 0,
        courseTopicIds: [],
        courseSkillIds: [],
        categoryId: 0,
        isPaid: true,
        price: '',
        discountedPrice: '',
        currencyCode: 'USD',
        thumbnailUrl: '',
        promoVideoUrl: '',
        promoVideoDurationSeconds: 0,
        promoVideoDurationText: '',
        badgeIds: [],
        mapExistingLectures: false,
        mappedLectures: [],
        sections: [],
        thumbnailFile: null,
        promoVideoFile: null
      });
    }
  }, [course, mode]);

  const createLectureData = (lecture, sortOrder) => {
    const mappingId = lecture.lmscourseMappingId || lecture.id;
    
    // Handle different ID structures for different lecture types
    let lectureId, lectureTitle, displayName;
    
    if (lecture.itemType === 'CERTIFICATE') {
      lectureId = lecture.id || lecture.courseCertificateId;
      lectureTitle = lecture.title || lecture.courseCertificateTitle;
      displayName = lecture.title || lecture.courseCertificateTitle;
    } else if (lecture.itemType === 'SHORT_COURSE') {
      lectureId = lecture.id || lecture.shortCourseId;
      lectureTitle = lecture.title || lecture.shortCourseTitle;
      displayName = lecture.title || lecture.shortCourseTitle;
    } else {
      // Regular LMS lectures
      lectureId = mappingId;
      lectureTitle = lecture.lmsLectureName || lecture.title || '';
      displayName = lecture.displayName || lecture.lmsLectureName || lecture.title;
    }
    
    return {
      id: lectureId,
      title: lectureTitle,
      source: lecture.source,
      lectureType: 1,
      isFreePreview: false,
      sortOrder,
      lmscourseMappingId: mappingId,
      displayName: displayName,
      lmsCourseId: lecture.lmsCourseId,
      lmsCourseName: lecture.lmsCourseName || '',
      lmsModuleId: lecture.lmsModuleId,
      lmsModuleName: lecture.lmsModuleName || '',
      itemType: lecture.itemType,
      courseCertificateId: lecture.courseCertificateId,
      shortCourseId: lecture.shortCourseId,
      shortCourseTitle: lecture.shortCourseTitle,
      courseCertificateTitle: lecture.courseCertificateTitle,
      lmsSubjectId: lecture.lmsSubjectId,
      lmsSubjectName: lecture.lmsSubjectName,
      lmsLectureId: lecture.lmsLectureId,
      lmsLectureName: lecture.lmsLectureName || lecture.title,
      lectureOverview: lecture.lectureOverview,
      lectureDescription: lecture.lectureDescription,
      tags: lecture.tags,
      courseType: lecture.courseType
    };
  };

  const createEmptySection = (sortOrder) => ({
    moduleName: sortOrder === 0 ? 'Module 1' : '',
    title: `Section ${sortOrder + 1}`,
    description: '',
    sortOrder,
    lectures: []
  });

  const getVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);

      video.preload = "metadata";
      video.src = objectUrl;

      video.onloadedmetadata = () => {
        const durationInSeconds = video.duration;
        URL.revokeObjectURL(objectUrl);

        if (!Number.isFinite(durationInSeconds)) {
          reject(new Error("Could not read video duration."));
          return;
        }

        resolve(durationInSeconds);
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Invalid video file or failed to load metadata."));
      };
    });
  };

  const getVideoDurationFromUrl = (url) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");

      video.preload = "metadata";
      video.src = url;

      video.onloadedmetadata = () => {
        const durationInSeconds = video.duration;

        if (!Number.isFinite(durationInSeconds)) {
          reject(new Error("Could not read video duration from URL."));
          return;
        }

        resolve(durationInSeconds);
      };

      video.onerror = () => {
        reject(new Error("Invalid video URL or failed to load metadata."));
      };
    });
  };

  const formatDuration = (seconds) => {
    const totalSeconds = Math.floor(seconds);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${mins}:${String(secs).padStart(2, "0")}`;
  };






  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    
    // Clear error when user starts making changes
    if (error && onClearError) {
      onClearError();
    }
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'courseTypeId') {
        const nextTypeId = Number(value);

        // Removed auto-checking for all course types - let user decide manually

        if (nextTypeId === 1) {
          newData.sections = prev.sections && prev.sections.length > 0 ? prev.sections : [createEmptySection(0)];
          newData.mappedLectures = [];
        }

        if (nextTypeId === 2 || nextTypeId === 3) {
          newData.sections = [];
        }

        // Don't automatically change mapExistingLectures when course type changes
      }

      if (name === 'mapExistingLectures') {
        newData.mapExistingLectures = checked === true;
      }
      if (name === 'isPaid' && !checked) {
        newData.price = '0';
        newData.discountedPrice = '0';
        newData.currencyCode = 'USD';
      }

      if (name === 'mapExistingLectures' && !checked) {
        newData.mappedLectures = [];
      }
      
      return newData;
    });
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLectureSelect = (lecture, action = 'add') => {
    const mappingId = lecture.lmscourseMappingId || lecture.id;

    setFormData((prev) => {
      const alreadySelected = (prev.mappedLectures || []).some((l) => (l.lmscourseMappingId || l.id) === mappingId);
      
      if (Number(prev.courseTypeId) === 3) {
        // For course type 3, only allow one lecture - always replace
        if (action === 'add' && !alreadySelected) {
          // Add new lecture (replace any existing)
          const lectureData = createLectureData(lecture, 0);
          return {
            ...prev,
            mappedLectures: [{ ...lectureData, sortOrder: 0 }]
          };
        }
        // For course type 3, don't allow removal through dropdown - use table instead
        return prev;
      } else {
        // For other course types, only add if not already selected
        if (!alreadySelected) {
          const lectureData = createLectureData(lecture, (prev.mappedLectures || []).length);
          return {
            ...prev,
            mappedLectures: [...(prev.mappedLectures || []), lectureData]
          };
        }
      }

      return prev; // No change if already selected (for other types) or invalid action
    });
  };

  const handleLectureRemove = (lectureId) => {
    setFormData((prev) => {
      const remaining = (prev.mappedLectures || []).filter((lecture) => (lecture.lmscourseMappingId || lecture.id) !== lectureId);
      const reSorted = remaining.map((lecture, index) => ({ ...lecture, sortOrder: index }));
      return { ...prev, mappedLectures: reSorted };
    });
  };

  const handleLectureReorder = (dragIndex, dropIndex) => {
    setFormData((prev) => {
      const next = [...(prev.mappedLectures || [])];
      const dragged = next[dragIndex];
      next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, dragged);
      const reSorted = next.map((lecture, index) => ({ ...lecture, sortOrder: index }));
      return { ...prev, mappedLectures: reSorted };
    });
  };

  const handleModalClose = () => {
    setIsClosing(true);
    // Clear any existing errors
    setFormErrors({});
    // Call the parent onClose function
    onClose();
    // Reset closing state after a short delay
    setTimeout(() => setIsClosing(false), 100);
  };

  const validateForm = () => {
    // Skip validation if modal is closing
    if (isClosing) {
      setFormErrors({});
      return true;
    }

    const errors = {};

    if (!formData.title || !formData.title.trim()) errors.title = 'Title is required';
    if (!formData.description || !formData.description.trim()) errors.description = 'Description is required';
    if (!formData.overview || !formData.overview.trim()) errors.overview = 'Overview is required';
    if (formData.courseTypeId === 0) errors.courseTypeId = 'Course type is required';
    if (formData.categoryId === 0) errors.categoryId = 'Category is required';
    if (formData.isPaid && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.price = 'Price must be greater than 0';
    }

    // Validate lectures mapping based on course type
    if (formData.courseTypeId === 1) {
      // For course type 1 (Professional Certificate), must select at least one course certificate
      if (!formData.mappedLectures || formData.mappedLectures.length === 0 ) {
        errors.mappedLectures = 'Please select at least one course certificate';
      }
    } else if (formData.courseTypeId === 2) {
      // For course type 2 (Course Certificate), must select at least one short course
      if (!formData.mappedLectures || formData.mappedLectures.length === 0) {
        errors.mappedLectures = 'Please select at least one short course';
      }
    } else if (formData.courseTypeId === 3 && formData.mapExistingLectures) {
      // For course type 3, lectures are mandatory only when existing creation is checked
      if (!formData.mappedLectures || formData.mappedLectures.length === 0) {
        errors.mappedLectures = 'Please select at least one lecture';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (mode === 'delete') {
      onSubmit();
      return;
    }
    
    if (validateForm()) {
      proceedWithSubmission();
    }
  };

  const proceedWithSubmission = async () => {
    if (!validateForm()) {
      return;
    }

    const submitData = new FormData();

    submitData.append('title', formData.title);
    submitData.append('subtitle', formData.subtitle || '');
    submitData.append('description', formData.description || '');
    submitData.append('overview', formData.overview || '');
    submitData.append('languageCode', formData.languageCode);
    submitData.append('courseTypeId', String(parseInt(formData.courseTypeId)));
    submitData.append('courseLevelId', String(parseInt(formData.courseLevelId)));
    submitData.append('categoryId', String(parseInt(formData.categoryId)));
    submitData.append('isNew', String(formData.mapExistingLectures !== true));
    submitData.append('isPaid', String(!!formData.isPaid));
    submitData.append('price', String(parseFloat(formData.price) || 0));
    submitData.append('discountedPrice', String(parseFloat(formData.discountedPrice) || 0));
    submitData.append('currencyCode', formData.currencyCode || '');
    submitData.append('promoVideoUrl', formData.promoVideoUrl || '');
    submitData.append('instructionForCourseCreation', formData.instructionForCourseCreation || '');
    submitData.append('IsThumbnailRemoved', String(!!formData.IsThumbnailRemoved));
    submitData.append('IsPromoVideoRemoved', String(!!formData.IsPromoVideoRemoved));
    
    // Add video duration only for short courses (courseTypeId 3)
    if (Number(formData.courseTypeId) === 3) {
      submitData.append('promoVideoDurationSeconds', String(formData.promoVideoDurationSeconds || 0));
    }

    if (formData.badgeIds && formData.badgeIds.length > 0) {
      formData.badgeIds.forEach((badgeId, index) => {
        submitData.append(`badgeIds[${index}]`, String(parseInt(badgeId)));
      });
    }

    if (formData.courseSkillIds && formData.courseSkillIds.length > 0) {
      formData.courseSkillIds.forEach((skillId, index) => {
        submitData.append(`courseSkillIds[${index}]`, String(parseInt(skillId)));
      });
    }

    if (formData.courseTopicIds && formData.courseTopicIds.length > 0) {
      formData.courseTopicIds.forEach((topicId, index) => {
        submitData.append(`courseTopicIds[${index}]`, String(parseInt(topicId)));
      });
    }

    if (parseInt(formData.courseTypeId) === 1) {
      // For course type 1, add hardcoded section with mapped lectures
      submitData.append('sections[0].moduleName', 'Default Module');
      submitData.append('sections[0].title', 'Default Section');
      submitData.append('sections[0].description', 'Default section description');
      submitData.append('sections[0].sortOrder', '0');

      // Add mapped lectures to the hardcoded section
      if (formData.mappedLectures && formData.mappedLectures.length > 0) {
        formData.mappedLectures.forEach((lecture, index) => {
          submitData.append(`sections[0].lectures[${index}].title`, lecture.title || '');
          submitData.append(`sections[0].lectures[${index}].lectureType`, String(lecture.lectureType || 1));
          submitData.append(`sections[0].lectures[${index}].isFreePreview`, String(!!lecture.isFreePreview));
          submitData.append(`sections[0].lectures[${index}].sortOrder`, String(lecture.sortOrder ?? index));
          submitData.append(`sections[0].lectures[${index}].lmscourseMappingId`, String(lecture.lmscourseMappingId || lecture.id || 0));
          submitData.append(`sections[0].lectures[${index}].source`, String(lecture.source || ''));
        });
      }
    } else if (parseInt(formData.courseTypeId) === 2) {
      // For course type 2, add hardcoded section with mapped lectures
      submitData.append('sections[0].moduleName', 'Default Module');
      submitData.append('sections[0].title', 'Default Section');
      submitData.append('sections[0].description', 'Default section description');
      submitData.append('sections[0].sortOrder', '0');

      // Add mapped lectures to the hardcoded section
      if (formData.mappedLectures && formData.mappedLectures.length > 0) {
        formData.mappedLectures.forEach((lecture, index) => {
          submitData.append(`sections[0].lectures[${index}].title`, lecture.title || '');
          submitData.append(`sections[0].lectures[${index}].lectureType`, String(lecture.lectureType || 1));
          submitData.append(`sections[0].lectures[${index}].isFreePreview`, String(!!lecture.isFreePreview));
          submitData.append(`sections[0].lectures[${index}].sortOrder`, String(lecture.sortOrder ?? index));
          submitData.append(`sections[0].lectures[${index}].lmscourseMappingId`, String(lecture.lmscourseMappingId || lecture.id || 0));
          submitData.append(`sections[0].lectures[${index}].source`, String(lecture.source || ''));
        });
      }
    } else if (formData.mapExistingLectures && formData.mappedLectures && formData.mappedLectures.length > 0) {
      if (parseInt(formData.courseTypeId) === 3) {
        formData.mappedLectures.forEach((lecture, index) => {
          submitData.append(`directLectures[${index}].title`, lecture.title || '');
          submitData.append(`directLectures[${index}].lectureType`, String(lecture.lectureType || 1));
          submitData.append(`directLectures[${index}].isFreePreview`, String(!!lecture.isFreePreview));
          submitData.append(`directLectures[${index}].sortOrder`, String(lecture.sortOrder ?? index));
          submitData.append(`directLectures[${index}].lmscourseMappingId`, String(lecture.lmscourseMappingId || lecture.id || 0));
          submitData.append(`directLectures[${index}].source`, String(lecture.source || ''));
        });
      } else {
        // For course type 2, add hardcoded section with mapped lectures
        submitData.append('sections[0].moduleName', 'Default Module');
        submitData.append('sections[0].title', 'Default Section');
        submitData.append('sections[0].description', 'Default section description');
        submitData.append('sections[0].sortOrder', '0');

        // Add mapped lectures to the hardcoded section
        formData.mappedLectures.forEach((lecture, index) => {
          submitData.append(`sections[0].lectures[${index}].title`, lecture.title || '');
          submitData.append(`sections[0].lectures[${index}].lectureType`, String(lecture.lectureType || 1));
          submitData.append(`sections[0].lectures[${index}].isFreePreview`, String(!!lecture.isFreePreview));
          submitData.append(`sections[0].lectures[${index}].sortOrder`, String(lecture.sortOrder ?? index));
          submitData.append(`sections[0].lectures[${index}].lmscourseMappingId`, String(lecture.lmscourseMappingId || lecture.id || 0));
          submitData.append(`sections[0].lectures[${index}].source`, String(lecture.source || ''));
        });
      }
    }

    if (formData.thumbnailFile) {
      submitData.append('File', formData.thumbnailFile);
    }
    if (formData.promoVideoFile) {
      submitData.append('PromoVideoFile', formData.promoVideoFile);
    }

    onSubmit(submitData, true);
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Course';
      case 'edit':
        return 'Update Course';
      case 'delete':
        return 'Delete Course';
      default:
        return 'Course';
    }
  };

  const getSubmitButtonText = () => {
    switch (mode) {
      case 'create':
        return 'Create Course';
      case 'edit':
        return 'Update Course';
      case 'delete':
        return 'Delete Course';
      default:
        return 'Submit';
    }
  };

  const getSubmitButtonIcon = () => {
    switch (mode) {
      case 'create':
      case 'edit':
        return <Save className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getSubmitButtonClass = () => {
    return mode === 'delete'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{getModalTitle()}</h2>
          <button
            onClick={handleModalClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Delete Confirmation */}
          {mode === 'delete' && course && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Trash2 className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="text-lg font-semibold text-yellow-800">Confirm Deletion</h3>
              </div>
              <p className="text-yellow-700 mb-2">
                Are you sure you want to delete the course "{course.title}"?
              </p>
              <p className="text-yellow-600 text-sm">
                This action cannot be undone and will permanently remove the course and all associated data.
              </p>
            </div>
          )}

          {/* Create/Edit Form */}
          {(mode === 'create' || mode === 'edit') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter course title"
                  disabled={loading}
                />
                {formErrors.title && <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>}
              </div>

              {/* Subtitle */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter course subtitle"
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter course description"
                  disabled={loading}
                />
                {formErrors.description && <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>}
              </div>

              {/* Overview */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Overview *</label>
                <textarea
                  name="overview"
                  value={formData.overview}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.overview ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter course overview"
                  disabled={loading}
                />
                {formErrors.overview && <p className="mt-1 text-sm text-red-600">{formErrors.overview}</p>}
              </div>

              {/* Instruction for Course Creation - Only for Short Courses */}
              {formData.courseTypeId === 3 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instruction for Course Creation</label>
                  <textarea
                    name="instructionForCourseCreation"
                    value={formData.instructionForCourseCreation}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter specific instructions for creating this short course"
                    disabled={loading}
                  />
                </div>
              )}

                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <CategoryDropdown
                      categories={categories}
                      value={formData.categoryId}
                      onChange={value => handleInputChange({ target: { name: 'categoryId', value } })}
                      placeholder="Select category"
                      loading={dropdownLoading.categories}
                      error={dropdownError.categories}
                      disabled={loading}
                    />
                    {formErrors.categoryId && <p className="mt-1 text-sm text-red-600">{formErrors.categoryId}</p>}
                  </div>

                
                </div>
          
              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  name="languageCode"
                  value={formData.languageCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="EN">English</option>
                  <option value="ES">Spanish</option>
                  <option value="FR">French</option>
                  <option value="DE">German</option>
                  <option value="IT">Italian</option>
                  <option value="PT">Portuguese</option>
                  <option value="RU">Russian</option>
                  <option value="ZH">Chinese</option>
                  <option value="JA">Japanese</option>
                  <option value="KO">Korean</option>
                </select>
              </div>

              {/* Course Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Type *</label>
                <GenericDropdown
                  items={courseTypes}
                  value={formData.courseTypeId}
                  onChange={value => handleInputChange({ target: { name: 'courseTypeId', value } })}
                  placeholder="Select course type"
                  loading={dropdownLoading.courseTypes}
                  error={dropdownError.courseTypes}
                  disabled={loading}
                  displayField='typeName'
                />
                {formErrors.courseTypeId && <p className="mt-1 text-sm text-red-600">{formErrors.courseTypeId}</p>}
                
                {/* Course Type Info */}
                {formData.courseTypeId > 0 && (
                  <div className={`mt-2 p-2 rounded-lg text-xs ${
                    formData.courseTypeId === 1 ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                    formData.courseTypeId === 2 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {formData.courseTypeId === 1 && (
                      <span><strong>Professional Certificate:</strong> Use this type for advanced structured courses.</span>
                    )}
                    {formData.courseTypeId === 2 && (
                      <span><strong>Certification:</strong> Use this type for certification-style courses.</span>
                    )}
                    {formData.courseTypeId === 3 && (
                      <span><strong>Short Course:</strong> Use this type for shorter courses.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Course Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Level</label>
                <GenericDropdown
                  items={courseLevels}
                  value={formData.courseLevelId}
                  onChange={value => handleInputChange({ target: { name: 'courseLevelId', value } })}
                  placeholder="Select course level"
                  loading={dropdownLoading.courseLevels}
                  error={dropdownError.courseLevels}
                  disabled={loading}
                  displayField='title'
                />
                {formErrors.courseLevelId && <p className="mt-1 text-sm text-red-600">{formErrors.courseLevelId}</p>}
              </div>

                {/* Course Topics */}
              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Topics</label>
                <MultiSelectDropdown
                  items={courseTopics || []}
                  values={formData.courseTopicIds}
                  onChange={courseTopicIds => handleInputChange({ target: { name: 'courseTopicIds', value: courseTopicIds } })}
                  placeholder="Select course topics"
                  loading={dropdownLoading.courseTopics}
                  error={dropdownError.courseTopics}
                  disabled={loading}
                  displayField="title"
                />
              </div>

              {/* Badges */}
              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Badges</label>
                <MultiSelectDropdown
                  items={badges}
                  values={formData.badgeIds}
                  onChange={badgeIds => handleInputChange({ target: { name: 'badgeIds', value: badgeIds } })}
                  placeholder="Select badges"
                  loading={dropdownLoading.badges}
                  error={dropdownError.badges}
                  disabled={loading}
                />
              </div>

              {/* Course Skills */}
              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Skills</label>
                <MultiSelectDropdown
                  items={courseSkills || []}
                  values={formData.courseSkillIds}
                  onChange={courseSkillIds => handleInputChange({ target: { name: 'courseSkillIds', value: courseSkillIds } })}
                  placeholder="Select course skills"
                  loading={dropdownLoading.courseSkills}
                  error={dropdownError.courseSkills}
                  disabled={loading}
                  displayField="title"
                />
              </div>

           {/* Hide isPaid checkbox when editing a course that is not paid */}
           {!(mode === 'edit' && course && course.isPaid === false) && (
           <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isPaid"
                        checked={formData.isPaid}
                        onChange={handleInputChange}
                        className="mr-2"
                        disabled={loading}
                      />
                      <label className="text-sm font-medium text-gray-700">This is a paid course</label>
                    </div>
           )}
              {/* Pricing */}
              <div className="md:col-span-2">
                {formData.isPaid && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors.price ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          disabled={loading}
                        />
                      </div>
                      {formErrors.price && <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Discounted Price</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          name="discountedPrice"
                          value={formData.discountedPrice}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select
                        name="currencyCode"
                        value={formData.currencyCode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="JPY">JPY</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Media */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Thumbnail</label>
                  <div className="flex items-start gap-4">
                    {/* Thumbnail Preview */}
                    <div className="flex-shrink-0">
                      {formData.thumbnailUrl ? (
                        <div className="relative">
                          <img
                            src={formData.thumbnailUrl}
                            alt="Course thumbnail"
                            className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: '', thumbnailFile: null, IsThumbnailRemoved: true }))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            disabled={loading}
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          type="file"
                          id="thumbnail-upload"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              // Create a temporary preview URL
                              const previewUrl = URL.createObjectURL(file);
                            setFormData(prev => ({
  ...prev,
  thumbnailUrl: previewUrl,
  thumbnailFile: file,
  IsThumbnailRemoved: false
}));
                            }
                          }}
                          className="hidden"
                          disabled={loading}
                        />
                        <label
                          htmlFor="thumbnail-upload"
                          className="inline-flex items-center px-4 py-2 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                          <Upload className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="text-sm text-blue-600 font-medium">
                            {formData.thumbnailUrl ? 'Change Thumbnail' : 'Upload Thumbnail'}
                          </span>
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Upload a course thumbnail (JPEG, PNG, GIF, or WebP, max 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lecture Video Upload - Only for Short Courses */}
                {formData.courseTypeId === 3 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lecture Video</label>
                  <div className="flex items-start gap-4">
                    {/* Video Preview */}
                    <div className="flex-shrink-0">
                      {formData.promoVideoFile ? (
                        <div className="relative">
                          <video
                            src={URL.createObjectURL(formData.promoVideoFile)}
                            className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200"
                            muted
                          />
                          {formData.promoVideoDurationText && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded-b-xl text-center">
                              {formData.promoVideoDurationText}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
  ...prev,
  promoVideoFile: null,
  promoVideoUrl: '',
  promoVideoDurationSeconds: 0,
  promoVideoDurationText: '',
  IsPromoVideoRemoved: true
}))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            disabled={loading}
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ) : formData.promoVideoUrl ? (
                        <div className="relative">
                          <video
                            src={formData.promoVideoUrl}
                            className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200"
                            muted
                          />
                          {formData.promoVideoDurationText && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded-b-xl text-center">
                              {formData.promoVideoDurationText}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              promoVideoFile: null,
                              promoVideoUrl: '',
                              promoVideoDurationSeconds: 0,
                              promoVideoDurationText: '',
                              IsPromoVideoRemoved: true
                            }))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            disabled={loading}
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          type="file"
                          id="promo-video-upload"
                          accept="video/mp4,video/webm,video/ogg"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              try {
                                // Only calculate duration for short courses (courseTypeId 3)
                                if (Number(formData.courseTypeId) === 3) {
                                  const durationInSeconds = await getVideoDuration(file);
                                  const durationText = formatDuration(durationInSeconds);
                                  
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    promoVideoFile: file,
                                    promoVideoDurationSeconds: Math.round(durationInSeconds),
                                    promoVideoDurationText: durationText
                                  }));
                                } else {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    promoVideoFile: file,
                                    promoVideoDurationSeconds: 0,
                                    promoVideoDurationText: ''
                                  }));
                                }
                              } catch (error) {
                                console.error('Error calculating video duration:', error);
                                // Still set the file even if duration calculation fails
                                setFormData(prev => ({ 
                                  ...prev, 
                                  promoVideoFile: file,
                                  promoVideoDurationSeconds: 0,
                                  promoVideoDurationText: ''
                                }));
                              }
                              
                              // Clear any existing errors
                              if (formErrors.promoVideoFile) {
                                setFormErrors(prev => ({ ...prev, promoVideoFile: '' }));
                              }
                            }
                          }}
                          className="hidden"
                          disabled={loading}
                        />
                        <label
                          htmlFor="promo-video-upload"
                          className="inline-flex items-center px-4 py-2 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all"
                        >
                          <Upload className="w-4 h-4 mr-2 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">
                            {formData.promoVideoFile ? 'Change Lecture Video' : formData.promoVideoUrl ? 'Replace Lecture Video' : 'Upload Lecture Video'}
                          </span>
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {formData.promoVideoUrl ? 'Current video from URL. Upload new file to replace.' : 'Upload a lecture video'}
                      </p>
                      {formData.promoVideoDurationText && (
                        <p className="mt-1 text-xs text-blue-600 font-medium">
                          Duration: {formData.promoVideoDurationText}
                        </p>
                      )}
                      {formErrors.promoVideoFile && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.promoVideoFile}</p>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>
  <div className="md:col-span-2">
                    {shouldShowExistingCreationCheckbox && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="mapExistingLectures"
                          checked={!!formData.mapExistingLectures}
                          onChange={handleInputChange}
                          className="mr-2"
                          disabled={loading}
                        />
                        <label className="text-sm font-medium text-gray-700">Existing creation</label>
                      </div>
                    )}

                  
                  </div>
              {shouldShowLectureMapping && (            
                   
                    <div className='md:col-span-2'>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select lectures to map
                      </label>

                      <div className="mb-4">
                        <LmsLecturesDropdown
                          onLectureSelect={handleLectureSelect}
                          selectedLectures={formData.mappedLectures}
                          courseTypeId={formData.courseTypeId}
                          courseLevelId={formData.courseLevelId}
                          disabled={loading}
                          placeholder="Search and add LMS lectures..."
                        />
                      </div>

                      <SelectedLecturesTable
                        selectedLectures={formData.mappedLectures}
                        onLectureRemove={handleLectureRemove}
                        onLectureReorder={handleLectureReorder}
                        courseType={formData.courseTypeId}
                        disabled={loading}
                        professionalHierarchy={course?.professionalHierarchy}
                      />
                      {formErrors.mappedLectures && (
                        <p className="mt-2 text-sm text-red-600">{formErrors.mappedLectures}</p>
                      )}
                    </div>
                  )}
                </div>
              )}



          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${getSubmitButtonClass()}`}
              disabled={loading}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {getSubmitButtonIcon()}
              {getSubmitButtonText()}
            </button>
          </div>

          {/* Global Error - Display at bottom */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
      />
    </div>
  );
};

export default CourseModal;
