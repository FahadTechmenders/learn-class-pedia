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
import BookManagement from '../pages/BookManagement/BookManagement';
import BookCategoryManagement from '../pages/BookCategoryManagement/BookCategoryManagement';
import BookBadgeMapping from '../pages/BookBadgeMapping/BookBadgeMapping';
import BookBadgeManagement from '../pages/BookBadgeManagement/BookBadgeManagement';
import PublisherBadgeMapping from '../pages/PublisherBadgeMapping/PublisherBadgeMapping';
import PublisherBadgeManagement from '../pages/PublisherBadgeManagement/PublisherBadgeManagement';
import PublisherBookSale from '../pages/PublisherBookSale/PublisherBookSale';
import BookReviewManagement from '../pages/BookReviewManagement/BookReviewManagement';
import PublisherCategoryMapping from '../pages/PublisherCategoryMapping/PublisherCategoryMapping';
import BookCategoryMapping from '../pages/BookCategoryMapping/BookCategoryMapping';
import LmsLeads from '../pages/LmsLeads/LmsLeads';
import LmsLeadsManagement from '../pages/LmsLeadsManagement/LmsLeadsManagement';
import LmsLeadDetails from '../pages/LmsLeadsManagement/LmsLeadDetails';

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
  BookManagement,
  BookCategoryManagement,
  BookBadgeMapping,
  BookBadgeManagement,
  PublisherBadgeMapping,
  PublisherBadgeManagement,
  PublisherBookSale,
  BookReviewManagement,
  PublisherCategoryMapping,
  BookCategoryMapping,
  LmsLeads,
  LmsLeadsManagement,
  LmsLeadDetails,
};

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

  const getRoutePath = (fullPath) => {
    return fullPath.replace('/admin/', '');
  };

  return (
    <Routes>
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
      <Route path="book-badge-mapping" element={
        <ProtectedRoute>
          <BookBadgeMapping />
        </ProtectedRoute>
      } />
      <Route path="book-badge-management" element={
        <ProtectedRoute>
          <BookBadgeManagement />
        </ProtectedRoute>
      } />
      <Route path="publisher-badge-mapping" element={
        <ProtectedRoute>
          <PublisherBadgeMapping />
        </ProtectedRoute>
      } />
      <Route path="publisher-badge-management" element={
        <ProtectedRoute>
          <PublisherBadgeManagement />
        </ProtectedRoute>
      } />
      <Route path="publisher-book-sale" element={
        <ProtectedRoute>
          <PublisherBookSale />
        </ProtectedRoute>
      } />
      <Route path="book-review-management" element={
        <ProtectedRoute>
          <BookReviewManagement />
        </ProtectedRoute>
      } />
      <Route path="publisher-category-mapping" element={
        <ProtectedRoute>
          <PublisherCategoryMapping />
        </ProtectedRoute>
      } />
      <Route path="book-category-mapping" element={
        <ProtectedRoute>
          <BookCategoryMapping />
        </ProtectedRoute>
      } />
      <Route path="lms-leads" element={
        <ProtectedRoute>
          <LmsLeadsManagement />
        </ProtectedRoute>
      } />
      <Route path="lms-leads/:customerId" element={
        <ProtectedRoute>
          <LmsLeadDetails />
        </ProtectedRoute>
      } />

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

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default DynamicRoutes;
