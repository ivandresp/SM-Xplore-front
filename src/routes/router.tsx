import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Placeholder } from '@/components/Placeholder'
import { NAV_ITEMS } from '@/config/navigation'
import { AppLayout } from '@/layouts/AppLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import {
  DashboardPage,
  NotFoundPage,
  CreateUserPage,
  ProviderApprovalPage,
  UserDetailPage,
  UsersPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  ActivityDetailPage,
  ExplorePage,
  ServiceDetailPage,
  ServiceListPage,
  SiteDetailPage,
  SiteListPage,
  EventDetailPage,
  EventFormPage,
  EventListPage,
  EventManageDetailPage,
  ManageEventsPage,
  PlannedEventsPage,
  ActivityFormPage,
  ActivityManagePage,
  AvailabilityPage,
  MyActivitiesPage,
  ItineraryPage,
  GuideProfilePage,
  MyProfilePage,
  ProviderProfilePage,
  ReceivedReservationDetailPage,
  ReceivedReservationsPage,
  MyServicesPage,
  ServiceFormPage,
  ServiceManagePage,
  MyReservationsPage,
  OnboardingPage,
  RecommendationsPage,
  ReservationDetailPage,
  ManageReportsPage,
  MyReportsPage,
  ReportDetailPage,
  ReportFormPage,
  ZoneFormPage,
  ZonesListPage,
  RegistrationsQueuePage,
} from './pages'
import { RequireAuth, RequireRole } from './guards'

/** Secciones del menú del panel que ya tienen pantalla propia. */
const IMPLEMENTED_SECTIONS = new Set([
  '/app/usuarios',
  '/app/perfil',
  '/app/reservas-recibidas',
  '/app/mis-actividades',
  '/app/disponibilidad',
  '/app/eventos',
  '/app/mis-servicios',
  '/app/reportes',
  '/app/zonas',
  '/app/solicitudes',
])

/** El resto de secciones existe como ruta provisional hasta implementarlas. */
const sectionRoutes = NAV_ITEMS.filter(
  (item) => item.to.startsWith('/app/') && !IMPLEMENTED_SECTIONS.has(item.to),
).map((item) => ({
  path: item.to.replace('/app/', ''),
  element: (
    <RequireRole roles={item.roles}>
      <Placeholder title={item.label} description={item.description} />
    </RequireRole>
  ),
}))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/explorar" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'registro', element: <RegisterPage /> },
      {
        path: 'registro/guia',
        element: <RegisterPage initialKind="GUIDE" />,
      },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      /* Catálogo de actividades (mockups 06-UC2/UC7/UC8 y 06-UC9) */
      { path: 'explorar', element: <ExplorePage /> },
      { path: 'actividades', element: <Navigate to="/explorar" replace /> },
      { path: 'actividades/:activityId', element: <ActivityDetailPage /> },
      /* Catálogo de eventos (mockups 07: UC4/UC5/UC6/UC7/UC8) */
      { path: 'eventos', element: <EventListPage /> },
      {
        path: 'eventos/planificados',
        element: (
          <RequireAuth>
            <RequireRole roles={['TOURIST']}>
              <PlannedEventsPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      { path: 'eventos/:eventId', element: <EventDetailPage /> },
      /* Catálogo de atractivos (sin mockup: patrón del catálogo de actividades) */
      { path: 'atractivos', element: <SiteListPage /> },
      { path: 'atractivos/:siteId', element: <SiteDetailPage /> },
      /* Catálogo de servicios (sin mockup: patrón del catálogo de actividades) */
      { path: 'servicios', element: <ServiceListPage /> },
      { path: 'servicios/:serviceId', element: <ServiceDetailPage /> },
      /* Perfiles públicos que consulta el turista (wireframes 12-UC4 y 12-UC5) */
      { path: 'guias/:guideId', element: <GuideProfilePage /> },
      { path: 'prestadoras/:providerId', element: <ProviderProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    /* Secciones del turista: usan el shell público, como en los diseños. */
    element: (
      <RequireAuth>
        <PublicLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: 'recomendaciones',
        element: (
          <RequireRole roles={['TOURIST']}>
            <RecommendationsPage />
          </RequireRole>
        ),
      },
      {
        path: 'mis-reservas',
        element: (
          <RequireRole roles={['TOURIST']}>
            <MyReservationsPage />
          </RequireRole>
        ),
      },
      {
        path: 'mis-reservas/:reservationId',
        element: (
          <RequireRole roles={['TOURIST']}>
            <ReservationDetailPage />
          </RequireRole>
        ),
      },
      { path: 'perfil', element: <MyProfilePage /> },
      /* Reportes de seguridad (wireframe 13: UC1/UC2/UC3/UC5) — turista, guía y prestadora */
      {
        path: 'reportes',
        element: (
          <RequireRole roles={['TOURIST', 'GUIDE', 'SERVICE_PROVIDER']}>
            <MyReportsPage />
          </RequireRole>
        ),
      },
      {
        path: 'reportes/nuevo',
        element: (
          <RequireRole roles={['TOURIST', 'GUIDE', 'SERVICE_PROVIDER']}>
            <ReportFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'reportes/:reportId',
        element: (
          <RequireRole roles={['TOURIST', 'GUIDE', 'SERVICE_PROVIDER']}>
            <ReportDetailPage />
          </RequireRole>
        ),
      },
      {
        path: 'itinerario',
        element: (
          <RequireRole roles={['TOURIST']}>
            <ItineraryPage />
          </RequireRole>
        ),
      },
    ],
  },
  {
    /* Onboarding de bienvenida del turista (B8b): pantalla propia, sin shell. */
    path: '/bienvenida',
    element: (
      <RequireAuth>
        <RequireRole roles={['TOURIST']}>
          <Suspense fallback={<p role="status">Preparando tu bienvenida…</p>}>
            <OnboardingPage />
          </Suspense>
        </RequireRole>
      </RequireAuth>
    ),
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      ...sectionRoutes,
      /* Cola de altas de guías y prestadoras (MS01-B8) — gestora y admin */
      {
        path: 'solicitudes',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <RegistrationsQueuePage />
          </RequireRole>
        ),
      },
      /* Gestión de usuarios (admin) — wireframes 12-UC6 y 12-UC7 */
      {
        path: 'usuarios',
        element: (
          <RequireRole roles={['ADMIN']}>
            <UsersPage />
          </RequireRole>
        ),
      },
      {
        path: 'usuarios/nuevo',
        element: (
          <RequireRole roles={['ADMIN']}>
            <CreateUserPage />
          </RequireRole>
        ),
      },
      {
        path: 'usuarios/prestadoras/:providerId',
        element: (
          <RequireRole roles={['ADMIN']}>
            <ProviderApprovalPage />
          </RequireRole>
        ),
      },
      {
        path: 'reservas-recibidas',
        element: (
          <RequireRole roles={['GUIDE', 'SERVICE_PROVIDER']}>
            <ReceivedReservationsPage />
          </RequireRole>
        ),
      },
      {
        path: 'reservas-recibidas/:reservationId',
        element: (
          <RequireRole roles={['GUIDE', 'SERVICE_PROVIDER']}>
            <ReceivedReservationDetailPage />
          </RequireRole>
        ),
      },
      /* Actividades del guía (mockups 06: UC1, UC3 y UC4/UC5/UC6) */
      {
        path: 'mis-actividades',
        element: (
          <RequireRole roles={['GUIDE', 'DESTINATION_MANAGER', 'ADMIN']}>
            <MyActivitiesPage />
          </RequireRole>
        ),
      },
      {
        path: 'mis-actividades/nueva',
        element: (
          <RequireRole roles={['GUIDE', 'DESTINATION_MANAGER', 'ADMIN']}>
            <ActivityFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'mis-actividades/:activityId',
        element: (
          <RequireRole roles={['GUIDE', 'DESTINATION_MANAGER', 'ADMIN']}>
            <ActivityManagePage />
          </RequireRole>
        ),
      },
      {
        path: 'disponibilidad',
        element: (
          <RequireRole roles={['GUIDE', 'DESTINATION_MANAGER', 'ADMIN']}>
            <AvailabilityPage />
          </RequireRole>
        ),
      },
      /* Gestión de eventos (mockups 07: UC1/UC3 y UC2/UC4/UC5) */
      {
        path: 'eventos',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <ManageEventsPage />
          </RequireRole>
        ),
      },
      {
        path: 'eventos/nuevo',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <EventFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'eventos/:eventId',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <EventManageDetailPage />
          </RequireRole>
        ),
      },
      /* Servicios de la prestadora */
      {
        path: 'mis-servicios',
        element: (
          <RequireRole roles={['SERVICE_PROVIDER', 'ADMIN']}>
            <MyServicesPage />
          </RequireRole>
        ),
      },
      {
        path: 'mis-servicios/nuevo',
        element: (
          <RequireRole roles={['SERVICE_PROVIDER', 'ADMIN']}>
            <ServiceFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'mis-servicios/:serviceId',
        element: (
          <RequireRole roles={['SERVICE_PROVIDER', 'ADMIN']}>
            <ServiceManagePage />
          </RequireRole>
        ),
      },
      /* Reportes de seguridad (gestora y admin) — wireframe 13-UC4 */
      {
        path: 'reportes',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <ManageReportsPage />
          </RequireRole>
        ),
      },
      {
        path: 'reportes/:reportId',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <ReportDetailPage />
          </RequireRole>
        ),
      },
      /* Zonas y sitios (wireframes 11) — API real `/zones` y `/sites` */
      {
        path: 'zonas',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <ZonesListPage />
          </RequireRole>
        ),
      },
      {
        path: 'zonas/nueva',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <ZoneFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'zonas/:zoneId',
        element: (
          <RequireRole roles={['DESTINATION_MANAGER', 'ADMIN']}>
            <ZoneFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'perfil',
        element: <MyProfilePage />,
      },
      /* El turista vive en el shell público: estas rutas duplicadas redirigen. */
      { path: 'explorar', element: <Navigate to="/explorar" replace /> },
      { path: 'mis-reservas', element: <Navigate to="/mis-reservas" replace /> },
      {
        path: 'usuarios/:userId',
        element: (
          <RequireRole roles={['ADMIN']}>
            <UserDetailPage />
          </RequireRole>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
