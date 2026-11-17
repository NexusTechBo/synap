# Guía para Claude

Este archivo tiene dos partes:
1. **Contexto del proyecto**: lo específico de este repositorio. Es lo único que hay que reescribir al reutilizar esta configuración en otro proyecto.
2. **Flujo de trabajo con agentes**: genérico para cualquier proyecto Spring Boot + Angular. Se copia tal cual junto con `.claude/agents/` y `.claude/skills/`.

Los agentes de `.claude/agents/` no tienen detalles del proyecto: leen esta sección para conocer estructura, convenciones y comandos.

---

# Parte 1 — Contexto del proyecto

## Descripción
**Synap** (marca visible: *Pulso*) es un SaaS multitenant de agenda para clínicas: gestión de citas, disponibilidad de doctores, excepciones de horario, pacientes, especialidades, personal, tablero en tiempo real, reserva pública para invitados (guest booking) y configuración regional por clínica (país, zona horaria e idioma por defecto; países soportados: BO y BR). Notificaciones por email (Brevo) y WhatsApp (servicio externo).

## Stack y versiones
| Capa | Tecnologías |
|------|-------------|
| Backend (`backend/`) | Spring Boot 4.0.x, Java 26 (toolchain Gradle), Spring Data JPA + PostgreSQL, Flyway, Spring Security + JWT (jjwt), WebSocket/STOMP, Spring AI (Google GenAI), MapStruct, Lombok, Bucket4j + Caffeine (rate limiting), springdoc-openapi, Micrometer tracing |
| Frontend (`frontend/`) | Angular 22 standalone, TypeScript 6, Tailwind CSS 4 (`@tailwindcss/postcss`), Angular CDK (diálogos), Chart.js, RxStomp, jwt-decode, Vitest (jsdom), Prettier + organize-imports |
| Infra | Docker / `docker-compose.yml`, despliegue en Railway (`railway.json`) |

## Backend
- **Paquete raíz**: `com.example.pulso`. Capas: `controller/` → `service/` (interfaces) → `service/impl/` → `repository/`. Además:
  - `service/component/` — componentes de apoyo a los servicios, agrupados por tipo: `provider/` (p. ej. `CurrentClinicProvider`, clínica del tenant actual) y `resolver/` (p. ej. `RegionalSettingsResolver`, defaults y validación de país/zona/idioma).
  - `dto/<dominio>/` (records `*Request`/`*Response`), `entity/`, `enums/`, `converter/` (`AttributeConverter` JPA), `validator/` (constraints de Bean Validation propias), `util/`.
  - `mapper/` — MapStruct con `componentModel = "spring"` e inyección por constructor (configurada globalmente con `mapstruct.defaultInjectionStrategy=constructor`). Las conversiones reutilizables van en mappers pequeños referenciados con `uses` (p. ej. `ClinicLanguageMapper`).
  - `exception/`, `config/`, `security/`, `middleware/` (filtros JWT, rate limit, access log), `websocket/` (tablero STOMP), `notification/` (eventos + listeners email/WhatsApp), `exchange/` (clientes HTTP a Brevo/WhatsApp).
- **Configuración regional**: `public.clinics` guarda `country`, `timezone` y `default_language`. El catálogo vive en `enums/SupportedCountry` y `enums/ClinicLanguage` (`es`, `en`, `pt-BR`) y se expone en `GET /api/regions` (público). La clínica actual se lee/edita en `/api/clinic/regional-settings` y viaja en los claims del JWT (`country`, `timezone`, `defaultLanguage`). La zona horaria de la clínica se aplica a los cálculos de hora local vía `ClinicTimeProvider` (ver Fechas/horas). `PUT /api/clinic/regional-settings` devuelve `{settings, token}` con un token renovado para que la sesión refleje la nueva configuración. Los tokens sin claim `timezone` válido se rechazan (401 en HTTP, `INVALID_TOKEN` en STOMP).
- **Multitenancy por schema**: schema `public` (datos globales: clínicas, activación) y un schema `clinic_<slug>` por clínica. El tenant actual vive en `config/tenant/TenantContext` (ThreadLocal) y lo resuelve `CustomTenantResolver`. Toda lectura/escritura de datos de clínica debe ocurrir con el tenant correcto; nunca filtrar datos entre clínicas.
- **Migraciones Flyway**: `src/main/resources/db/migration/public/` y `.../tenant/` (las de tenant se aplican a cada schema de clínica).
- **Roles** (`enums/ERole`): `ADMINISTRATOR`, `DOCTOR`, `ASSISTANT`, `GUEST`. Autorización con `@PreAuthorize(RoleExpressions.X)` (constantes en `security/RoleExpressions`: `STAFF`, `ADMINISTRATOR`, `ADMINISTRATOR_OR_ASSISTANT`, `DOCTOR`, `GUEST`).
- **Errores**: lanzar subclases de `ApiException` (`BadRequestException`, `BusinessException`, `ResourceNotFoundException`, `ForbiddenException`, `UnauthorizedException`, `ServiceUnavailableException`) con una clave de `exception/MessageKeys`. `GlobalExceptionHandler` las traduce a `ErrorResponse`. Cada clave nueva debe existir en **`messages.properties` y `messages_es.properties`** (lo verifica `MessageKeysBundleTest`).
- **Fechas/horas**: la hora local de la clínica ("ahora"/"hoy" en validaciones de citas, disponibilidad, excepciones) se obtiene de `ClinicTimeProvider` (`now()`/`today()`), cuya zona viene del claim `timezone` del JWT a través de `TenantContext` (`getCurrentZone()`); requiere tenant. Los instantes, tokens (JWT, activación, invitado) y `createdAt` usan el `java.time.Clock` global (bean en `ClockConfig`, zona `app.zone`, por defecto `America/La_Paz`); no usar `LocalDateTime.now()` sin clock.
- **JPA**: `open-in-view: false` → cargar lo necesario dentro de la transacción del servicio.
- **Controllers**: `@RestController` bajo `/api/...`, `@RequiredArgsConstructor`, `@Tag`/`@Operation` de OpenAPI, `@Valid` en los request bodies.

## Frontend
- **Estructura** (`src/app/`):
  - `core/api/` — clientes HTTP por recurso (`*.api.ts`) y socket del tablero.
  - `core/auth/` — `auth.service`, guards (`authGuard`, `guestGuard`, `roleGuard`), `roles.ts`, sesión de invitado.
  - `core/http/` — interceptores (`apiUrlInterceptor`, `authInterceptor`) y `api-error` (parseo de `ErrorResponse`).
  - `core/catalogs/` — stores con signals (doctores, especialidades), `clinic-scoped-resource`.
  - `core/clinic/` — stores de la clínica actual: catálogo regional (`RegionsStore`) y configuración regional (`ClinicRegionalSettingsStore`, semilla desde el JWT y refresco desde el endpoint).
  - `core/i18n/` — `I18nService` (signals, idiomas `es`/`en`), diccionarios `es.ts`/`en.ts`, `TranslatePipe` en `shared/pipes`.
  - `core/models/`, `core/navigation/` (títulos de página, paths), `core/utils/` (utilidades genéricas usadas por varios features).
  - `features/<feature>/` — páginas `*-page.component.ts` lazy-loaded, con `components/` y `*.service.ts` propios. `*.model.ts`/`*.util.ts` solo si sus tipos o funciones los usan 2 o más archivos del feature; si los usa uno solo, van dentro de ese archivo.
  - `shared/` — `components/`, `ui/`, `pipes/`, `services/`, `utils/` (`validators.util.ts`: validadores y mensajes de formulario) reutilizables por 2 o más features; lo que usa un solo feature vive en ese feature.
  - `layout/shell/` — layout autenticado.
- **Rutas**: `app.routes.ts` con `loadComponent` y guards; títulos en `PAGE_TITLES`.
- **Change detection**: con zone.js (`provideZoneChangeDetection({ eventCoalescing: true })`), componentes `OnPush`.
- **Idioma**: UI traducida con `I18nService` (`es` por defecto, `en`); todo texto visible va en `es.ts` y `en.ts`. `LOCALE_ID = 'es'`.
- **Proxy de desarrollo** (`proxy.conf.js`): `/api` y `/ws` → `BACKEND_URL` (por defecto `http://localhost:8080`).
- **Formato**: Prettier (`printWidth: 100`, comillas simples).

## Convenciones generales
- **Sin comentarios en el código** (`//`, `/** */`, `<!-- -->`, `--` en SQL), ni en backend ni en frontend, incluidos los tests. El código debe explicarse con nombres claros.
- **Sin código muerto**: no dejar métodos, atributos, constantes, exports ni imports sin uso.

## Testing
- **Backend**: JUnit 5 + Mockito.
  - Services: tests unitarios con `@ExtendWith(MockitoExtension.class)` en `src/test/.../service/impl/`.
  - Controllers: `@WebMvcTest(controllers = X.class, properties = "rate-limit.enabled=false")` + `@Import(SecurityConfig, JacksonConfig, LocaleConfig, ...)` + `@MockitoBean`. Tokens de prueba en `controller/SliceTokens`. Referencia: `controller/PatientControllerTest.java`.
- **Frontend**: Vitest con `@angular/build:unit-test`; specs junto al archivo. Referencias: `core/api/appointments.api.spec.ts`, `core/auth/auth.guards.spec.ts`, `features/patients/patients-page.component.spec.ts`. **No** hay `@playwright/test` instalado y no se debe agregar; la verificación en navegador se hace con el Playwright MCP.

## Comandos

| Tarea | Backend (`cd backend`) | Frontend (`cd frontend`) |
|-------|------------------------|--------------------------|
| Compilar | `./gradlew compileJava compileTestJava` | `npm run build` |
| Tests | `./gradlew test` | `npm run test:ci` |
| Build completo | `./gradlew build` | `npm run build` |
| Formato | — | `npm run format:check` / `npm run format` |
| Levantar | `./gradlew bootRun` (http://localhost:8080) | `npm start` (http://localhost:4200) |

- Variables de entorno: `backend/.env` y `frontend/.env` (plantillas en `.env.example`). El backend necesita PostgreSQL (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`) y `JWT_SECRET`.
- Swagger UI disponible al levantar el backend (springdoc).

---

# Parte 2 — Flujo de trabajo con agentes (reutilizable)

Skills (`.claude/skills/`): `java-springboot` (backend) y `angular-developer` (frontend).

## Agentes

| Agente | Rol | Skill | Edita código |
|--------|-----|-------|--------------|
| `backend-developer` | Implementa en Spring Boot 4 / Java 26+ | java-springboot | Sí (`src/main`) |
| `backend-code-reviewer` | Calidad, design patterns, SOLID, seguridad | java-springboot | No |
| `backend-tester` | Tests unitarios/slice (JUnit 5, Mockito, WebMvcTest) | java-springboot | Solo tests |
| `frontend-developer` | Implementa en Angular 22 | angular-developer | Sí |
| `frontend-code-reviewer` | Calidad, design patterns, SOLID, signals | angular-developer | No |
| `frontend-tester` | Tests unitarios (Vitest); sin instalar dependencias nuevas | angular-developer | Solo tests |
| `ui-reviewer` | Revisión visual/UX en navegador (Playwright MCP) | angular-developer | No |

## Flujo de trabajo obligatorio

Cuando el usuario pase una instrucción de desarrollo (feature, bug, refactor), **tú (Claude principal) actúas como orquestador**: no implementas directamente, delegas en los agentes y controlas el ciclo. Los subagentes no pueden invocarse entre sí, así que tú pasas los resultados de uno a otro.

### Paso 0 — Análisis (orquestador)
1. Analiza el requerimiento y explora el código relevante.
2. Determina el alcance: **backend**, **frontend** o **ambos** (full-stack).
3. Si hay ambigüedades que cambian la implementación, pregunta al usuario antes de lanzar agentes.
4. Redacta un brief para el developer: objetivo, criterios de aceptación, archivos/áreas implicadas, restricciones y contratos de API.

### Flujo Backend
```
Análisis → 
                                    ┌──────────────────────────────────────────────┐
                                    ▼                                              │
                    backend-developer → backend-code-reviewer → CHANGES_REQUESTED──┘
                                    ▲                │ APPROVED
                                    │                ▼
                                    └────FAIL── backend-tester
                                                     │ PASS + APPROVED
                                                     ▼
                                                    FIN
```
1. Lanza `backend-developer` con el brief.
2. Lanza `backend-code-reviewer` con el resumen del developer y los archivos modificados.
   - `CHANGES_REQUESTED` → vuelve al paso 1 pasando **los hallazgos BLOCKER/MAJOR** al developer.
   - `APPROVED` → continúa.
3. Lanza `backend-tester` con el resumen de la implementación.
   - `FAIL` por bug de producción → vuelve al paso 1 con la tabla de fallas; tras la corrección, **repite el paso 2** (review) antes de volver a testear.
   - `PASS` → FIN.

### Flujo Frontend
```
Análisis →
                            ┌──────────────────────────────────────────────┐
                            ▼                                              │
                     frontend-developer → frontend-code-reviewer ──CHANGES_REQUESTED
                            ▲                        │ APPROVED
                            │                        ▼
                            └────FAIL─────────frontend-tester  (en paralelo)
                            CHANGE_REQUESTED    ui-reviewer
                                                     │ PASS + APPROVED
                                                     ▼
                                                    FIN
```
1. Lanza `frontend-developer` con el brief.
2. Lanza `frontend-code-reviewer`.
   - `CHANGES_REQUESTED` → vuelve al paso 1 con los hallazgos.
   - `APPROVED` → continúa.
3. Lanza **en paralelo, en un mismo mensaje**, `frontend-tester` y `ui-reviewer`, pasando a ambos las rutas/vistas afectadas que reportó el developer.
   - Si cualquiera devuelve `FAIL` o `CHANGES_REQUESTED` → **consolida los hallazgos de ambos** en un solo feedback y vuelve al paso 1; luego repite el paso 2 y el 3.
   - `PASS` + `APPROVED` → FIN.

### Flujo Full-stack (backend + frontend)
1. Define primero el contrato de API (endpoints, DTOs, códigos de error) en el análisis.
2. Ejecuta el **flujo backend completo** primero.
3. Luego el **flujo frontend completo**, usando el contrato ya implementado.
4. Si el frontend descubre un problema del contrato, vuelve al flujo backend.

### Reglas del ciclo
- **Límite de iteraciones**: máximo **3 vueltas** developer ↔ reviewer/tester por flujo. Si se supera, detente y presenta al usuario el estado y los hallazgos pendientes para que decida.
- Al devolver feedback al developer, pasa solo hallazgos **BLOCKER/MAJOR** (los MINOR como sugerencias opcionales) y sé específico (archivo:línea).
- Reutiliza el contexto: en cada lanzamiento incluye el brief original + lo cambiado en la iteración anterior, ya que cada agente arranca sin memoria.
- Tareas triviales (typo, cambio de texto, config de una línea) o preguntas/explicaciones no requieren el flujo completo; resuélvelas directamente salvo que el usuario pida el flujo.
- No hagas commit ni push salvo que el usuario lo pida.

### Reporte final al usuario
Al terminar, resume:
- Qué se implementó y archivos principales modificados.
- Número de iteraciones y hallazgos relevantes corregidos.
- Tests creados y resultado de las suites.
- Resultado del UI review (frontend) y cualquier punto "no verificado" o MINOR pendiente.
