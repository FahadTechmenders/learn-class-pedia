import { X, ChevronLeft, ChevronRight, User, LogOut, Star, ChevronDown, Brain, Percent, Award, Mail, Users, ShoppingCart, CreditCard, Book, BookOpen, Tag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDynamicRoutes } from '../../../hooks/api/useDynamicRoutes';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { theme } = useTheme();
  const { getMainNavItems, getManagementItems, loading, error } = useDynamicRoutes();
  const [activeRoute, setActiveRoute] = useState(location.pathname);
  const [expandedMenus, setExpandedMenus] = useState({});

  // Update active route when location changes
  useEffect(() => {
    setActiveRoute(location.pathname);
  }, [location.pathname]);

  const handleNavigation = (path) => {
    // Ensure path is complete (add /admin prefix if missing)
    const fullPath = path.startsWith('/admin/') ? path : `/admin/${path}`;
    setActiveRoute(fullPath);
    navigate(fullPath);
    if (isOpen) {
      onClose();
    }
  };

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const isMenuExpanded = (menuId) => {
    return expandedMenus[menuId] || false;
  };

  // Render menu item with submenu support
  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const fullPath = item.path && item.path.startsWith('/admin/') ? item.path : item.path ? `/admin/${item.path}` : '';
    const isActive = fullPath && (activeRoute === fullPath || activeRoute.startsWith(fullPath + '/'));
    const isExpanded = isMenuExpanded(item.id);

    if (hasChildren && !isCollapsed) {
      return (
        <div key={item.id}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                // Navigate if item has a path
                if (item.path) {
                  handleNavigation(item.path);
                }
              }}
              className={`
                flex-1 flex items-center gap-2 px-3 py-2 rounded-l-lg
                transition-all duration-200 relative
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              style={{ paddingLeft: `${level * 12 + 12}px` }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-sm truncate flex-1 text-left">{item.label}</span>
            </button>
            <button
              onClick={() => toggleMenu(item.id)}
              className={`
                p-3 rounded-r-lg transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <ChevronDown 
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </button>
          </div>
          
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => item.path && handleNavigation(item.path)}
        className={`
          w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-lg
          transition-all duration-200 relative
          ${isActive
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        style={{ paddingLeft: `${level * 12 + (isCollapsed ? 12 : 12)}px` }}
        title={isCollapsed ? item.label : undefined}
      >
        <item.icon className={`w-4 h-4 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
        {!isCollapsed && <span className="font-semibold text-sm truncate">{item.label}</span>}
      </button>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const mainNavItems = getMainNavItems();
  const managementItems = getManagementItems();
  
  // Modify existing items to create Skill as main navbar with Course Skill Mapping as child
  const allManagementItems = [
    // Find Course Management index to insert Student Management after it
    ...(function() {
      const courseMgmtIndex = managementItems.findIndex(item =>
        item.label?.toLowerCase().includes('course') ||
        item.path?.includes('course') ||
        item.id?.includes('course')
      );

      let items = [...managementItems];

      if (courseMgmtIndex !== -1) {
        // Insert Student Management as parent menu after Course Management
        const beforeItems = items.slice(0, courseMgmtIndex + 1);
        const afterItems = items.slice(courseMgmtIndex + 1);

        items = [
          ...beforeItems,
          {
            id: 'student-management-parent',
            label: 'Student Management',
            icon: Users,
            path: 'student-management',
            children: [
              {
                id: 'student-order-management',
                label: 'Student Orders',
                icon: ShoppingCart,
                path: 'student-order-management'
              },
              {
                id: 'payment-method-management',
                label: 'Payment Methods',
                icon: CreditCard,
                path: 'payment-method-management'
              }
            ]
          },
          // Add Book Management right after Student Management
          {
            id: 'book-management-parent',
            label: 'Book Management',
            icon: Book,
            path: 'book-management',
            children: [
              {
                id: 'book-category-management',
                label: 'Book Category',
                icon: BookOpen,
                path: 'book-category-management'
              },
              {
                id: 'book-badge-management',
                label: 'Book Badge Management',
                icon: Award,
                path: 'book-badge-management'
              },
              {
                id: 'book-badge-mapping',
                label: 'Book Badge Mapping',
                icon: Tag,
                path: 'book-badge-mapping'
              },
              {
                id: 'publisher-book-sale',
                label: 'Publisher Book Sales',
                icon: ShoppingCart,
                path: 'publisher-book-sale'
              },
              {
                id: 'book-review-management',
                label: 'Book Reviews',
                icon: Star,
                path: 'book-review-management'
              },
              {
                id: 'book-category-mapping',
                label: 'Book Category Mapping',
                icon: Tag,
                path: 'book-category-mapping'
              }
            ]
          },
          // Add Publisher Management right after Book Management
          {
            id: 'publisher-management-parent',
            label: 'Publisher Management',
            icon: Users,
            path: 'publisher-management',
            children: [
              {
                id: 'publisher-badge-management',
                label: 'Publisher Badge Management',
                icon: Award,
                path: 'publisher-badge-management'
              },
              {
                id: 'publisher-badge-mapping',
                label: 'Publisher Badge Mapping',
                icon: Tag,
                path: 'publisher-badge-mapping'
              },
              {
                id: 'publisher-category-mapping',
                label: 'Publisher Category Mapping',
                icon: Tag,
                path: 'publisher-category-mapping'
              }
            ]
          },
          ...afterItems.filter(item => item.id !== 'payment-method-management')
        ];
      } else {
        // If no Course Management found, add at the end
        items = [
          ...items,
          {
            id: 'student-management-parent',
            label: 'Student Management',
            icon: Users,
            path: 'student-management',
            children: [
              {
                id: 'student-order-management',
                label: 'Student Orders',
                icon: ShoppingCart,
                path: 'student-order-management'
              },
              {
                id: 'payment-method-management',
                label: 'Payment Methods',
                icon: CreditCard,
                path: 'payment-method-management'
              }
            ]
          },
          {
            id: 'book-management-parent',
            label: 'Book Management',
            icon: Book,
            path: 'book-management',
            children: [
              {
                id: 'book-category-management',
                label: 'Book Category',
                icon: BookOpen,
                path: 'book-category-management'
              },
              {
                id: 'book-badge-management',
                label: 'Book Badge Management',
                icon: Award,
                path: 'book-badge-management'
              },
              {
                id: 'book-badge-mapping',
                label: 'Book Badge Mapping',
                icon: Tag,
                path: 'book-badge-mapping'
              },
              {
                id: 'publisher-book-sale',
                label: 'Publisher Book Sales',
                icon: ShoppingCart,
                path: 'publisher-book-sale'
              },
              {
                id: 'book-review-management',
                label: 'Book Reviews',
                icon: Star,
                path: 'book-review-management'
              },
              {
                id: 'book-category-mapping',
                label: 'Book Category Mapping',
                icon: Tag,
                path: 'book-category-mapping'
              }
            ]
          },
          {
            id: 'publisher-management-parent',
            label: 'Publisher Management',
            icon: Users,
            path: 'publisher-management',
            children: [
              {
                id: 'publisher-badge-management',
                label: 'Publisher Badge Management',
                icon: Award,
                path: 'publisher-badge-management'
              },
              {
                id: 'publisher-badge-mapping',
                label: 'Publisher Badge Mapping',
                icon: Tag,
                path: 'publisher-badge-mapping'
              },
              {
                id: 'publisher-category-mapping',
                label: 'Publisher Category Mapping',
                icon: Tag,
                path: 'publisher-category-mapping'
              }
            ]
          }
        ];
      }

      // Filter out any existing Publisher Management, Book Management, and related items from the original list
      // But keep the manually added items (student-management-parent, book-management-parent, publisher-management-parent)
      items = items.filter(item => {
        const label = item.label?.toLowerCase() || '';
        const id = item.id?.toLowerCase() || '';
        // Keep manually added items
        if (id === 'student-management-parent' || id === 'book-management-parent' || id === 'publisher-management-parent') {
          return true;
        }
        // Filter out original publisher, book category, book badge, and publisher book sales items
        return !label.includes('publisher') &&
               !label.includes('book category') &&
               !label.includes('book badge') &&
               !label.includes('publisher book sale') &&
               !id.includes('publisher') &&
               !id.includes('book-category') &&
               !id.includes('book-badge') &&
               !id.includes('publisher-book-sale');
      });

      return items;
    })(),
    // Ensure Skills management is included
    {
      id: 'skills-management',
      label: 'Skills',
      icon: Brain,
      path: 'career-skills',
      children: [
        {
          id: 'skill-mapping',
          label: 'Skill Mapping',
          icon: Brain,
          path: 'skill-mapping'
        }
      ]
    },
    // Add Templates after Skills
    {
      id: 'templates',
      label: 'Templates',
      icon: Award,
      path: 'templates'
    }
  ].map(item => {
    // Preserve manually added items
    if (item.id === 'student-management-parent' || item.id === 'book-management-parent' || item.id === 'publisher-management-parent') {
      return item;
    }

    // Filter out separate Course Skill Mapping item
    if (item.id === 'skill-mapping' || item.label === 'Skill Mapping') {
      return null;
    }

    // Filter out old email templates item
    if (item.id === 'email-templates' || item.label === 'Email Templates') {
      return null;
    }

    // Filter out separate Certificate Template item
    if (item.id === 'certificate-templates' || item.label === 'Certificate Templates') {
      return null;
    }

 

    // Filter out standalone Book Management (now a parent with children)
    if (item.id === 'book-management' || (item.label?.toLowerCase() === 'book management' && !item.children)) {
      return null;
    }

    // Filter out standalone Book Category Management (now a child of Book Management)
    if (item.id === 'book-category-management' || item.label?.toLowerCase().includes('book categor')) {
      return null;
    }

    // Filter out standalone Book Badge Mapping (now a child of Book Management)
    if (item.id === 'book-badge-mapping' || item.label?.toLowerCase().includes('book badge')) {
      return null;
    }
    
    // Create Skill as main navbar with Course Skill Mapping as child
    if (item.id === 'career-skills' || item.label === 'Career Skills') {
      return {
        ...item,
        id: 'skill',
        label: 'Skill',
        path: 'career-skills', // Make parent clickable
        children: [
          {
            id: 'skill-mapping',
            label: 'Skill Mapping',
            icon: Brain,
            path: 'skill-mapping'
          }
        ]
      };
    }
    
    // Create Discount Rates as main navbar with Assign Discount Rate as child
    if (item.id === 'discount-rates' || item.label === 'Discount Rates') {
      return {
        ...item,
        id: 'discount-rates',
        label: 'Discount Rates',
        path: 'discount-rates', // Make parent clickable
        children: [
          {
            id: 'assign-discount-rate',
            label: 'Assign Discount Rate',
            icon: Percent,
            path: 'assign-discount-rate'
          }
        ]
      };
    }
    
    // Handle Career Roles with Career Path as child
    if (item.id === 'career-roles' || item.label === 'Career Roles') {
      return {
        ...item,
        path: 'career-roles', // Make parent clickable
        children: [
          {
            id: 'career-path',
            label: 'Career Path',
            icon: User,
            path: 'career-path'
          }
        ]
      };
    }
    
    // Filter out separate Career Path item
    if (item.id === 'career-path' || item.label === 'Career Path') {
      return null;
    }
    
    // Filter out separate Assign Discount Rate item
    if (item.id === 'assign-discount-rate' || item.label === 'Assign Discount Rate') {
      return null;
    }
    
    return item;
  }).filter(Boolean); // Remove null items

  // Reorder items to place Publisher Management right after Book Management
  const reorderedItems = (function() {
    const bookMgmtIndex = allManagementItems.findIndex(item => item.id === 'book-management-parent');
    const publisherMgmtIndex = allManagementItems.findIndex(item => item.id === 'publisher-management-parent');

    if (bookMgmtIndex !== -1 && publisherMgmtIndex !== -1 && publisherMgmtIndex > bookMgmtIndex + 1) {
      // Publisher Management exists but is not right after Book Management
      const items = [...allManagementItems];
      const publisherItem = items.splice(publisherMgmtIndex, 1)[0];
      items.splice(bookMgmtIndex + 1, 0, publisherItem);
      return items;
    }
    return allManagementItems;
  })();
  
  // Handle loading state
  if (loading) {
    return (
      <aside className={`fixed lg:sticky inset-y-0 left-0 z-50 top-0 h-screen ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <img 
                src="/logo.svg" 
                alt="Classpedia" 
                className={`w-50 h-50 ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
              />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </aside>
    );
  }

  // Handle error state
  if (error) {
    return (
      <aside className={`fixed lg:sticky inset-y-0 left-0 z-50 top-0 h-screen ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <img 
                src="/logo.svg" 
                alt="Classpedia" 
                className={`w-40 h-40 ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
              />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-red-500 dark:text-red-400 text-sm text-center">
              {isCollapsed ? 'Error' : `Error: ${error}`}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky inset-y-0 left-0 z-50 top-0 h-screen
          ${isCollapsed ? 'w-16 lg:w-20' : 'w-64 lg:w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Collapse Toggle */}
          <div className="flex items-center justify-between p-3 lg:p-5 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 min-w-0">
              <img 
                src="/logo.svg" 
                alt="Classpedia" 
                className={`w-50 h-50 lg:w-50 lg:h-50 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''} ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Collapse Toggle - Desktop Only */}
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <button 
                onClick={onClose}
                className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 lg:p-4 space-y-4 lg:space-y-6 overflow-y-auto scrollbar-hide scroll-smooth">
            {/* Main Navigation */}
            <div>
              {!isCollapsed && (
                <h3 className={`px-3 text-sm font-semibold uppercase tracking-wider mb-2 lg:mb-2 text-sm lg:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hidden lg:block`} style={{fontSize: '0.75rem'}}>
                  Main Menu
                </h3>
              )}
              <div className="space-y-1">
                {mainNavItems.map((item) => {
                  // Ensure we're comparing full paths
                  const fullPath = item.path && item.path.startsWith('/admin/') ? item.path : item.path ? `/admin/${item.path}` : '';
                  // Check if current route starts with the item path for sub-routes
                  const isActive = fullPath && (activeRoute === fullPath || activeRoute.startsWith(fullPath + '/'));
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => item.path && handleNavigation(item.path)}
                      className={`
                        w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 lg:px-3 py-2 lg:py-2 rounded-lg
                        transition-all duration-200 relative
                        ${isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <item.icon className={`w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                      {!isCollapsed && <span className="font-semibold text-sm truncate lg:block">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Management Section */}
            <div>
              {!isCollapsed && (
                <h3 className={`px-3 text-sm font-semibold uppercase tracking-wider mb-2 lg:mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hidden lg:block`}>
                  Management
                </h3>
              )}
              <div className="space-y-1">
                {reorderedItems.map((item) => renderMenuItem(item))}
              </div>
            </div>

            {/* Logout Button */}
            <div className="p-2 lg:p-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleLogout}
                className={`
                  w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 lg:px-3 py-2 lg:py-2 rounded-lg
                  transition-all duration-200 relative
                  text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                `}
                title={isCollapsed ? 'Logout' : undefined}
              >
                <LogOut className={`w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="font-semibold text-sm hidden lg:block">Logout</span>}
              </button>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
