import { useState, useEffect, useCallback, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../../../hooks/api/useAdmin';
import { useCareerPath } from '../../../../hooks/api/useCareerPath';
import CareerPathForm from './CareerPathForm';
import AdminPageLayout from '../../../../components/AdminPageLayout';
import GenericDropdown from '../../../../components/GenericDropdown';
import {
  Plus,
  Filter,
  Clock,
  BookOpen,
  Users,
  Calendar,
  Star,
  Award,
  Target,
  Sparkles,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Route as RouteIcon
} from 'lucide-react';

const filterReducer = (state, action) => {
  switch (action.type) {
    case 'SET_TEMP_TITLE':
      return { ...state, tempTitle: action.payload };
    case 'SET_TEMP_SEARCH_TERM':
      return { ...state, tempSearchTerm: action.payload };
    case 'SET_TEMP_ROLE_ID':
      return { ...state, tempSelectedRoleId: action.payload };
    case 'RESET_TEMP_FILTERS':
      return { 
        tempTitle: '',
        tempSearchTerm: '',
        tempSelectedRoleId: ''
      };
    case 'SYNC_TEMP_FILTERS':
      return {
        tempTitle: action.payload.title || '',
        tempSearchTerm: action.payload.searchTerm || '',
        tempSelectedRoleId: action.payload.selectedRoleId || ''
      };
    default:
      return state;
  }
};

const CareerPath = () => {
  const navigate = useNavigate();
  const {
    getAllCareerPaths,
    getCareerPathById,
    createCareerPathWithFile,
    updateCareerPathWithFile,
    deleteCareerPath
  } = useAdmin();
  const { getCareerRoles } = useCareerPath();
  const [careerPaths, setCareerPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [title, setTitle] = useState('');
  const [careerRoles, setCareerRoles] = useState([]);
  const [tempFilters, dispatchTempFilters] = useReducer(filterReducer, {
    tempTitle: '',
    tempSearchTerm: '',
    tempSelectedRoleId: ''
  });

  const [hoveredCard, setHoveredCard] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [totalItems, setTotalItems] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0); 
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCareerPath, setEditingCareerPath] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch career roles on component mount
  useEffect(() => {
    const fetchCareerRoles = async () => {
      try {
        const rolesData = await getCareerRoles();
        const roles = Array.isArray(rolesData) ? rolesData : rolesData.items || [];
        setCareerRoles(roles);
      } catch (error) {
        console.error('Failed to fetch career roles:', error);
        setCareerRoles([]);
      }
    };
    
    fetchCareerRoles();
  }, [getCareerRoles]);

  const fetchCareerPaths = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        page: currentPage,
        pageSize: itemsPerPage
      };
      
      if (title) {
        params.Title = title;
      }
      
      if (selectedRoleId) {
        params.RoleId = selectedRoleId;
      }
      
    
      
      const response = await getAllCareerPaths(params);
      
      if (response && typeof response === 'object') {
        if (response.data && Array.isArray(response.data)) {
          setCareerPaths(response.data);
          setTotalItems(response.totalCount || response.total || response.data.length);
          setServerTotalPages(serverTotalPages || Math.ceil((response.totalCount || response.total || response.data.length) / itemsPerPage));
        } 
        else if (Array.isArray(response)) {
          setCareerPaths(response);
          setTotalItems(response.length);
          setServerTotalPages(Math.ceil(response.length / itemsPerPage));
        }
        else if (response.items && Array.isArray(response.items)) {
          setCareerPaths(response.items);
          setTotalItems(response.totalCount || response.total || response.items.length);
          setServerTotalPages(response.totalPages || Math.ceil((response.totalCount || response.total || response.items.length) / itemsPerPage));
        }
        else {
          setCareerPaths([]);
          setTotalItems(0);
          setServerTotalPages(0);
        }
      } else {
        setCareerPaths([]);
        setTotalItems(0);
        setServerTotalPages(0);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch career paths. Please try again.');
      setCareerPaths([]);
      setTotalItems(0);
      setServerTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [getAllCareerPaths, currentPage, itemsPerPage, title, selectedRoleId, serverTotalPages]);

  useEffect(() => {
    fetchCareerPaths();
  }, [currentPage, itemsPerPage, title, selectedRoleId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [title, selectedRoleId, searchTerm]);

  // Sync temporary states when filters are opened
  useEffect(() => {
    if (showFilters) {
      dispatchTempFilters({ 
        type: 'SYNC_TEMP_FILTERS', 
        payload: {
          title,
          searchTerm,
          selectedRoleId
        }
      });
    }
  }, [showFilters, title, selectedRoleId, searchTerm]);

  const clearFilters = () => {
    setTitle('');
    setSearchTerm('');
    setSelectedRoleId('');
    dispatchTempFilters({ type: 'RESET_TEMP_FILTERS' });
  };


  const handleCreateCareerPath = () => {
    setEditingCareerPath(null);
    setShowCreateForm(true);
  };

  const handleEditCareerPath = async (careerPath) => {
    try {
      setFormLoading(true);
      const careerPathDetails = await getCareerPathById(careerPath.id);
      setEditingCareerPath(careerPathDetails);
      setShowCreateForm(true);
    } catch (error) {
      showToast('Failed to fetch career path details. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveCareerPath = async (careerPathData, isFormData = false) => {
    try {
      setFormLoading(true);
      
      if (editingCareerPath) {
        if (isFormData) {
          await updateCareerPathWithFile(editingCareerPath.id, careerPathData);
        } else {   
          const formData = new FormData();
          if (careerPathData.title) formData.append('Title', careerPathData.title);
          if (careerPathData.description) formData.append('Description', careerPathData.description);
          if (careerPathData.price !== undefined) formData.append('Price', careerPathData.price);
          if (careerPathData.discountedPrice !== undefined) formData.append('DiscountedPrice', careerPathData.discountedPrice);
          if (careerPathData.durationMinMonths !== undefined) formData.append('DurationMinMonths', careerPathData.durationMinMonths);
          if (careerPathData.sortOrder !== undefined) formData.append('SortOrder', careerPathData.sortOrder);
          if (careerPathData.durationMaxMonths !== undefined) formData.append('DurationMaxMonths', careerPathData.durationMaxMonths);
          if (careerPathData.outcome) formData.append('Outcome', careerPathData.outcome);
          if (careerPathData.overview) formData.append('overview', careerPathData.overview);
          if (careerPathData.altTextImage) formData.append('AltTextImage', careerPathData.altTextImage);
          if (careerPathData.roleId !== undefined) formData.append('RoleId', careerPathData.roleId);
          if (editingCareerPath) {
            if (careerPathData.iconFile === null && careerPathData.iconUrl === editingCareerPath.iconUrl) {
              formData.append('IconUrl', editingCareerPath.iconUrl || ''); // Send existing icon URL
            } else if (careerPathData.iconFile !== null) {
              // New file uploaded - IconUrl will be set by backend
              formData.append('IconUrl', careerPathData.iconUrl || '');
            } else if (careerPathData.RemoveIcon === true) {
              // User explicitly removed icon
              formData.append('IconUrl', '');
              formData.append('RemoveIcon', 'true');
            }
          } else {
            // During create, handle icon
            if (careerPathData.iconFile !== null) {
              formData.append('IconUrl', careerPathData.iconUrl || '');
            }
          }
          
          if (careerPathData.levels && careerPathData.levels.length > 0) {
            careerPathData.levels.forEach((level, index) => {
              formData.append(`Levels[${index}].levelMapId`, level.levelMapId || level.levelId);
              formData.append(`Levels[${index}].levelId`, level.levelId);
              if (level.durationMaxMonths !== undefined) formData.append(`Levels[${index}].durationMaxMonths`, level.durationMaxMonths);
              if (level.price !== undefined) formData.append(`Levels[${index}].price`, level.price);
              if (level.discountedPrice !== undefined) formData.append(`Levels[${index}].discountedPrice`, level.discountedPrice);
              if (level.sortOrder !== undefined) formData.append(`Levels[${index}].sortOrder`, level.sortOrder);
              if (level.durationMinMonths !== undefined) formData.append(`Levels[${index}].durationMinMonths`, level.durationMinMonths);
              if (level.outcome) formData.append(`Levels[${index}].outcome`, level.outcome);
              if (level.certificateCount !== undefined) formData.append(`Levels[${index}].certificateCount`, level.certificateCount);
              if (level.title) formData.append(`Levels[${index}].title`, level.title);
              if (level.overview) formData.append(`Levels[${index}].overview`, level.overview);
              if (level.description) formData.append(`Levels[${index}].description`, level.description);
              level.courses.forEach((course, courseIndex) => {
                formData.append(`Levels[${index}].courses[${courseIndex}].courseId`, course.courseId);
                formData.append(`Levels[${index}].courses[${courseIndex}].courseSequence`, course.courseSequence);
              });
            });
          }
          
          if (careerPathData.skills && careerPathData.skills.length > 0) {
            careerPathData.skills.forEach((skill, index) => {
              formData.append(`Skills[${index}].skillId`, skill.skillId);
              formData.append(`Skills[${index}].proficiencyLevel`, skill.proficiencyLevel);
            });
          }
          
          if (careerPathData.careerPathBadges && careerPathData.careerPathBadges.length > 0) {
            careerPathData.careerPathBadges.forEach((badgeId, index) => {
              formData.append(`CareerPathBadges[${index}]`, badgeId);
            });
          }
          
          // Add RemoveIcon flag if set
          if (careerPathData.RemoveIcon === true) {
            formData.append('RemoveIcon', 'true');
          }
          
          await updateCareerPathWithFile(editingCareerPath.id, formData);
        }
        showToast('Career path updated successfully!', 'success');
      } else {
        if (isFormData) {
          await createCareerPathWithFile(careerPathData);
        } else {
          const formData = new FormData();
          if (careerPathData.title) formData.append('Title', careerPathData.title);
          if (careerPathData.description) formData.append('Description', careerPathData.description);
          if (careerPathData.price !== undefined) formData.append('Price', careerPathData.price);
          if (careerPathData.discountedPrice !== undefined) formData.append('DiscountedPrice', careerPathData.discountedPrice);
          if (careerPathData.durationMinMonths !== undefined) formData.append('DurationMinMonths', careerPathData.durationMinMonths);
          if (careerPathData.sortOrder !== undefined) formData.append('SortOrder', careerPathData.sortOrder);
          if (careerPathData.durationMaxMonths !== undefined) formData.append('DurationMaxMonths', careerPathData.durationMaxMonths);
          if (careerPathData.outcome) formData.append('Outcome', careerPathData.outcome);
          if (careerPathData.overview) formData.append('overview', careerPathData.overview);
          if (careerPathData.altTextImage) formData.append('AltTextImage', careerPathData.altTextImage);
          if (careerPathData.certificateCount !== undefined) formData.append('CertificateCount', careerPathData.certificateCount);
          if (careerPathData.roleId !== undefined) formData.append('RoleId', careerPathData.roleId);
    
          // Handle icon for create operation
          if (careerPathData.iconFile !== null) {
            formData.append('IconUrl', careerPathData.iconUrl || '');
          }
    
          if (careerPathData.levels && careerPathData.levels.length > 0) {
            careerPathData.levels.forEach((level, index) => {
              formData.append(`Levels[${index}].levelMapId`, level.levelMapId || level.levelId);
              formData.append(`Levels[${index}].levelId`, level.levelId);
              if (level.durationMaxMonths !== undefined) formData.append(`Levels[${index}].durationMaxMonths`, level.durationMaxMonths);
              if (level.price !== undefined) formData.append(`Levels[${index}].price`, level.price);
              if (level.discountedPrice !== undefined) formData.append(`Levels[${index}].discountedPrice`, level.discountedPrice);
              if (level.sortOrder !== undefined) formData.append(`Levels[${index}].sortOrder`, level.sortOrder);
              if (level.durationMinMonths !== undefined) formData.append(`Levels[${index}].durationMinMonths`, level.durationMinMonths);
              if (level.outcome) formData.append(`Levels[${index}].outcome`, level.outcome);
              if (level.certificateCount !== undefined) formData.append(`Levels[${index}].certificateCount`, level.certificateCount);
              if (level.title) formData.append(`Levels[${index}].title`, level.title);
              if (level.overview) formData.append(`Levels[${index}].overview`, level.overview);
              if (level.description) formData.append(`Levels[${index}].description`, level.description);
              level.courses.forEach((course, courseIndex) => {
                formData.append(`Levels[${index}].courses[${courseIndex}].courseId`, course.courseId);
                formData.append(`Levels[${index}].courses[${courseIndex}].courseSequence`, course.courseSequence);
              });
            });
          }
          
          if (careerPathData.skills && careerPathData.skills.length > 0) {
            careerPathData.skills.forEach((skill, index) => {
              formData.append(`Skills[${index}].skillId`, skill.skillId);
              formData.append(`Skills[${index}].proficiencyLevel`, skill.proficiencyLevel);
            });
          }
          
          if (careerPathData.careerPathBadges && careerPathData.careerPathBadges.length > 0) {
            careerPathData.careerPathBadges.forEach((badgeId, index) => {
              formData.append(`CareerPathBadges[${index}]`, badgeId);
            });
          }
          await createCareerPathWithFile(formData);
        }
        showToast('Career path created successfully!', 'success');
      }
      
      setShowCreateForm(false);
      setEditingCareerPath(null);
      fetchCareerPaths(); 
    } catch (error) {

      let errorMessage = editingCareerPath 
        ? 'Failed to update career path. Please try again.' 
        : 'Failed to create career path. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        errorMessage = error.response.data;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (careerPath) => {
    setDeleteConfirm(careerPath);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    
    try {
      setFormLoading(true);
      await deleteCareerPath(deleteConfirm.id);
      showToast('Career path deleted successfully!', 'success');
      setDeleteConfirm(null);
      fetchCareerPaths(); 
    } catch (error) {
      showToast('Failed to delete career path. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const calculateTotalCourses = (levels) => {
    return levels?.reduce((total, level) => total + (level.courses?.length || 0), 0) || 0;
  };

  const getFirstFewCourses = (levels, count = 3) => {
    const allCourses = [];
    levels?.forEach(level => {
      if (level.courses) {
        allCourses.push(...level.courses);
      }
    });
    return allCourses.slice(0, count);
  };

  const getSkillsSummary = (skills) => {
    if (!skills || skills.length === 0) return 'No skills specified';
    const totalSkills = skills.length;
    const avgProficiency = skills.reduce((sum, skill) => sum + (skill.proficiencyLevel || 0), 0) / totalSkills;
    return `${totalSkills} skills (Avg: ${avgProficiency.toFixed(1)})`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return <AdminPageLayout loading={true} skeletonType="cards" />;
  }

  if (error) {
    return (
      <AdminPageLayout
        title="Career Paths"
        subtitle="Discover your perfect learning journey"
        icon={RouteIcon}
        loading={false}
        skeletonType="cards"
      >
        <div className="text-red-500 p-4">{error}</div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title="Career Paths"
      subtitle="Discover your perfect learning journey"
      icon={RouteIcon}
      loading={false}
      skeletonType="cards"
      actions={
        <>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
              (showFilters || title || selectedRoleId)
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {(showFilters || title || selectedRoleId) && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-full">
                Active
              </span>
            )}
          </button>
          <button 
            onClick={handleCreateCareerPath}
            className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Career Path
          </button>
        </>
      }
    >
      {/* Filters Section */}
      {showFilters && (
        <div className="relative z-[9998] bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 lg:px-8">
          <div className="py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Options</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={tempFilters.tempTitle}
                  onChange={(e) => dispatchTempFilters({ type: 'SET_TEMP_TITLE', payload: e.target.value })}
                  placeholder="Search by title..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Career Role</label>
                <GenericDropdown
                  items={careerRoles.map(role => ({ id: role.id, name: role.name }))}
                  value={tempFilters.tempSelectedRoleId}
                  onChange={(value) => dispatchTempFilters({ type: 'SET_TEMP_ROLE_ID', payload: value })}
                  placeholder="Select role..."
                  className="w-full"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    dispatchTempFilters({ type: 'SET_TEMP_SEARCH_TERM', payload: '' });
                    dispatchTempFilters({ type: 'SET_TEMP_TITLE', payload: '' });
                    dispatchTempFilters({ type: 'SET_TEMP_ROLE_ID', payload: '' });
                  }}
                  className="w-50 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                >
                  Clear All
                </button>
                 <button
                  onClick={() => {
                    setTitle(tempFilters.tempTitle);
                    setSearchTerm(tempFilters.tempSearchTerm);
                    setSelectedRoleId(tempFilters.tempSelectedRoleId);
                    setCurrentPage(1);
                    setShowFilters(false);
                  }}
                  className="w-50 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-sm"
                >
                  Apply Filters
                </button>
              </div>
            
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {title || selectedRoleId ? (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Showing <span className="font-semibold">{careerPaths.length}</span> of {totalItems} career paths
              </p>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : null}

        {careerPaths.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {careerPaths.length === 0 ? 'No career paths found' : 'No matching career paths'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {careerPaths.length === 0 
                ? 'Create your first career path to get started' 
                : 'Try adjusting your search or filters to find what you\'re looking for'
              }
            </p>
            {careerPaths.length === 0 && (
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl">
                <Plus className="w-4 h-4 mr-2 inline" />
                Create Your First Career Path
              </button>
            )}
            {(searchTerm) && (
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {careerPaths.map((path) => {
              const totalCourses = calculateTotalCourses(path.levels);
              const firstCourses = getFirstFewCourses(path.levels, 3);
              const isHovered = hoveredCard === path.id;
              
              return (
                <div 
                  key={path.id} 
                  className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden ${
                    isHovered ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredCard(path.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 pr-4 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                          <span className="line-clamp-2">{path.title}</span>
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full flex-shrink-0">
                            {path.status || 'Active'}
                          </span>
                          {path.price && (
                            <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full flex-shrink-0">
                              ${path.price}
                            </span>
                          )}
                          {path.discountedPrice && path.discountedPrice < path.price && (
                            <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full flex-shrink-0">
                              ${path.discountedPrice}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Award className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed line-clamp-3">
                      {path.description}
                    </p>
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{totalCourses}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">Courses</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="flex items-center justify-center text-green-600 dark:text-green-400 mb-2">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {path.durationMinMonths}-{path.durationMaxMonths}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">Months</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <div className="flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {path.levels?.length || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">Levels</div>
                      </div>
                                          </div>
                    {path.skills && path.skills.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Skills</div>
                          <Star className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">{getSkillsSummary(path.skills)}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {path.skills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                                Lvl {skill.proficiencyLevel}
                              </span>
                            ))}
                            {path.skills.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-400 text-white rounded-full">
                                +{path.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Course Certificate Section */}
                    {path.certificateCount > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course Certificates</div>
                          <Award className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                                {path.certificateCount} Certificate{path.certificateCount !== 1 ? 's' : ''} Available
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Earn certificates upon course completion
                              </p>
                            </div>
                            <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full">
                              <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {firstCourses.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Learning Path</div>
                          <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </div>
                        <div className="space-y-2">
                          {firstCourses.map((course, index) => (
                            <div key={course.courseId} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                              <div className="flex-1 min-w-0 mr-2">
                                <div className="text-gray-900 dark:text-gray-100 font-semibold text-sm truncate" title={course.title}>
                                  {course.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={course.categoryName}>
                                  {course.categoryName}
                                </div>
                              </div>
                              {course.isPaid && (
                                <span className="px-2 py-1 text-xs bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full font-medium flex-shrink-0">
                                  Paid
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {totalCourses > 3 && (
                          <div className="text-center mt-3">
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                              +{totalCourses - 3} more courses
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(path.creationTime || path.createdAt)}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button 
                          onClick={() => navigate(`/admin/career-paths/${path.id}`)}
                          className="flex items-center px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold group whitespace-nowrap"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </button>
                        <button 
                          onClick={() => handleEditCareerPath(path)}
                          className="flex items-center px-2 py-1.5 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold group whitespace-nowrap"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(path)}
                          className="flex items-center px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold group whitespace-nowrap"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {serverTotalPages > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, serverTotalPages))}
                disabled={currentPage === serverTotalPages}
                className="flex items-center px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Next
                <ChevronRightIcon className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <CareerPathForm
              careerPath={editingCareerPath}
              onSave={handleSaveCareerPath}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingCareerPath(null);
              }}
              loading={formLoading}
              showToast={showToast}
            />
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
              Delete Career Path
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={formLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={formLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {formLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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

    </AdminPageLayout>
  );
};

export default CareerPath;
