import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdmin } from '../../../hooks/api/useAdmin';
import { useAuth } from '../../../context/AuthContext';
import Dashboard from '../pages/Dashboard/Dashboard';
import CourseManagement from '../pages/CourseManagement/CourseManagement';
import CareerPath from '../pages/CareerPath/CareerPath';
import CareerPathDetail from '../pages/CareerPath/CareerPathDetail';
import FeaturedMarking from '../pages/FeaturedMarking/FeaturedMarking';
import ChangePassword from '../pages/ChangePassword/ChangePassword';
import CategoryManagement from '../pages/CategoryManagement/CategoryManagement';
import CareerRoles from '../pages/CareerPath/CareerRoles';
import CareerSkills from '../pages/CareerPath/CareerSkills';
import CourseSkillMapping from '../pages/CourseSkillMapping/CourseSkillMapping';
import TemplateManagement from '../pages/TemplateManagement/TemplateManagement';
import ReviewManagementPage from '../pages/ReviewManagementPage/ReviewManagementPage';
import AssignDiscountRate from '../pages/AssignDiscountRate/AssignDiscountRate';
import DiscountRates from '../pages/DiscountRates/DiscountRates';
import TopicManagement from '../pages/TopicManagement/TopicManagement';
import SlugManagement from '../pages/SlugManagement/SlugManagement';
import StudentManagement from '../pages/StudentManagement/StudentManagement';
import StudentOrderManagement from '../pages/StudentOrderManagement/StudentOrderManagement';
import PaymentMethodManagement from '../pages/PaymentMethodManagement/PaymentMethodManagement';
import PaymentProviders from '../pages/PaymentProviders/PaymentProviders';
import PaymentProviderAccounts from '../pages/PaymentProviderAccounts/PaymentProviderAccounts';
import ContactUs from '../pages/ContactUs/ContactUs';
import CourseContent from '../pages/CourseContent/CourseContent';
import TestimonialManagement from '../pages/TestimonialManagement/TestimonialManagement';
import Email from '../pages/Email/Email';
import PublisherManagement from '../pages/PublisherManagement/PublisherManagement';
import PublisherCategoryManagement from '../pages/PublisherCategoryManagement/PublisherCategoryManagement';
import BookManagement from '../pages/BookManagement/BookManagement';
import BookCategoryManagement from '../pages/BookCategoryManagement/BookCategoryManagement';

// Component mapping
const componentMap = {
  Dashboard,
  CourseManagement,
  CareerPath,
  CareerPathDetail,
  FeaturedMarking,
  ChangePassword,
  CategoryManagement,
  CareerRoles,
  CareerSkills,
  CourseSkillMapping,
  TemplateManagement,
  ReviewManagementPage,
  AssignDiscountRate,
  DiscountRates,
  TopicManagement,
  SlugManagement,
  StudentManagement,
  StudentOrderManagement,
  PaymentMethodManagement,
  PaymentProviders,
  PaymentProviderAccounts,
  ContactUs,
  CourseContent,
  TestimonialManagement,
  Email,
  PublisherManagement,
  PublisherCategoryManagement,
  BookManagement,
  BookCategoryManagement,
};

// Protected Route Component
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/admin/login" replace />;
};

const DynamicRoutes = () => {
  const { user } = useAuth();
  const { getRoutesByRole } = useAdmin();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadRoutes = async () => {
      // Check if user exists
      if (!user) {
        setLoading(false);
        setError('No user authenticated');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userRoutes = await getRoutesByRole(user?.roleId);
        
        if (!userRoutes || !Array.isArray(userRoutes)) {
          throw new Error('Invalid routes data received');
        }
        
        setRoutes(userRoutes);
      } catch (err) {
        setError(`Failed to load routes: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadRoutes();
  }, [user, getRoutesByRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading routes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Extract route path from full path (e.g., /admin/dashboard -> dashboard)
  // But preserve the full path for navigation
  const getRoutePath = (fullPath) => {
    // Remove /admin prefix and keep the rest
    return fullPath.replace('/admin/', '');
  };

  return (
    <Routes>
      {/* Default redirect to dashboard */}
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="career-paths/:id" element={
        <ProtectedRoute>
          <CareerPathDetail />
        </ProtectedRoute>
      } />
      <Route path="career-roles" element={
        <ProtectedRoute>
          <CareerRoles />
        </ProtectedRoute>
      } />
      <Route path="career-skills" element={
        <ProtectedRoute>
          <CareerSkills />
        </ProtectedRoute>
      } />
      <Route path="skill-mapping" element={
        <ProtectedRoute>
          <CourseSkillMapping />
        </ProtectedRoute>
      } />
      <Route path="career-path" element={
        <ProtectedRoute>
          <CareerPath />
        </ProtectedRoute>
      } />
      <Route path="review-management" element={
        <ProtectedRoute>
          <ReviewManagementPage />
        </ProtectedRoute>
      } />
      <Route path="assign-discount-rate" element={
        <ProtectedRoute>
          <AssignDiscountRate />
        </ProtectedRoute>
      } />
      <Route path="student-management" element={<StudentManagement />} />
      <Route path="student-order-management" element={<StudentOrderManagement />} />
      <Route path="payment-method-management" element={<PaymentMethodManagement />} />
      <Route path="course-content/:lectureId" element={
        <ProtectedRoute>
          <CourseContent />
        </ProtectedRoute>
      } />
      <Route path="templates" element={
        <ProtectedRoute>
          <TemplateManagement />
        </ProtectedRoute>
      } />
      <Route path="email" element={
        <ProtectedRoute>
          <Email />
        </ProtectedRoute>
      } />
      <Route path="email/:folder" element={
        <ProtectedRoute>
          <Email />
        </ProtectedRoute>
      } />
      <Route path="email/:folder/:id" element={
        <ProtectedRoute>
          <Email />
        </ProtectedRoute>
      } />
      <Route path="book-management" element={
        <ProtectedRoute>
          <BookManagement />
        </ProtectedRoute>
      } />
      <Route path="book-category-management" element={
        <ProtectedRoute>
          <BookCategoryManagement />
        </ProtectedRoute>
      } />
      
      {/* Dynamic routes based on user role */}
      {routes.map((route) => {
        const Component = componentMap[route.component];
        const routePath = getRoutePath(route.path);
        
        if (!Component) {
          console.warn(`Component ${route.component} not found for route ${route.path}`);
          return null;
        }

        return (
          <Route
            key={route.id}
            path={routePath}
            element={
              <ProtectedRoute>
                <Component />
              </ProtectedRoute>
            }
          />
        );
      })}

      {/* Fallback for unauthorized routes */}
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default DynamicRoutes;
