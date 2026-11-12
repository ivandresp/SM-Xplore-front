import { lazy } from 'react'

/* Cada página viaja en su propio trozo: la primera carga solo trae el shell. */
export const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
export const CreateUserPage = lazy(() => import('@/pages/admin/CreateUserPage'))
export const ProviderApprovalPage = lazy(
  () => import('@/pages/admin/ProviderApprovalPage'),
)
export const UserDetailPage = lazy(() => import('@/pages/admin/UserDetailPage'))
export const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))
export const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
export const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
export const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
export const ActivityDetailPage = lazy(
  () => import('@/pages/catalog/ActivityDetailPage'),
)
export const ExplorePage = lazy(() => import('@/pages/catalog/ExplorePage'))
export const ServiceDetailPage = lazy(
  () => import('@/pages/catalog/ServiceDetailPage'),
)
export const ServiceListPage = lazy(() => import('@/pages/catalog/ServiceListPage'))
export const SiteDetailPage = lazy(() => import('@/pages/catalog/SiteDetailPage'))
export const SiteListPage = lazy(() => import('@/pages/catalog/SiteListPage'))
export const EventDetailPage = lazy(() => import('@/pages/events/EventDetailPage'))
export const EventFormPage = lazy(() => import('@/pages/events/EventFormPage'))
export const EventListPage = lazy(() => import('@/pages/events/EventListPage'))
export const EventManageDetailPage = lazy(
  () => import('@/pages/events/EventManageDetailPage'),
)
export const ManageEventsPage = lazy(() => import('@/pages/events/ManageEventsPage'))
export const PlannedEventsPage = lazy(() => import('@/pages/events/PlannedEventsPage'))
export const ActivityFormPage = lazy(() => import('@/pages/guide/ActivityFormPage'))
export const ActivityManagePage = lazy(() => import('@/pages/guide/ActivityManagePage'))
export const AvailabilityPage = lazy(() => import('@/pages/guide/AvailabilityPage'))
export const MyActivitiesPage = lazy(() => import('@/pages/guide/MyActivitiesPage'))
export const ItineraryPage = lazy(() => import('@/pages/itinerary/ItineraryPage'))
export const GuideProfilePage = lazy(() => import('@/pages/profile/GuideProfilePage'))
export const MyProfilePage = lazy(() => import('@/pages/profile/MyProfilePage'))
export const ProviderProfilePage = lazy(
  () => import('@/pages/profile/ProviderProfilePage'),
)
export const ReceivedReservationDetailPage = lazy(
  () => import('@/pages/provider/ReceivedReservationDetailPage'),
)
export const ReceivedReservationsPage = lazy(
  () => import('@/pages/provider/ReceivedReservationsPage'),
)
export const MyServicesPage = lazy(() => import('@/pages/provider/MyServicesPage'))
export const ServiceFormPage = lazy(() => import('@/pages/provider/ServiceFormPage'))
export const ServiceManagePage = lazy(
  () => import('@/pages/provider/ServiceManagePage'),
)
export const MyReservationsPage = lazy(
  () => import('@/pages/reservations/MyReservationsPage'),
)

export const RecommendationsPage = lazy(
  () => import('@/pages/recommendations/RecommendationsPage'),
)

export const ReservationDetailPage = lazy(
  () => import('@/pages/reservations/ReservationDetailPage'),
)
export const ManageReportsPage = lazy(() => import('@/pages/reports/ManageReportsPage'))
export const MyReportsPage = lazy(() => import('@/pages/reports/MyReportsPage'))
export const ReportDetailPage = lazy(() => import('@/pages/reports/ReportDetailPage'))
export const ReportFormPage = lazy(() => import('@/pages/reports/ReportFormPage'))
export const RegistrationsQueuePage = lazy(
  () => import('@/pages/registrations/RegistrationsQueuePage'),
)
export const ZoneFormPage = lazy(() => import('@/pages/zones/ZoneFormPage'))
export const ZonesListPage = lazy(() => import('@/pages/zones/ZonesListPage'))

