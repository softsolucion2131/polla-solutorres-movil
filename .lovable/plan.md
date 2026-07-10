# Plan: App de Apuestas Hípicas (MVP)

Aplicación web en español con autenticación multi-rol (Administrador, Agencia, Jugador), gestión de agencias, catálogos, hipódromos, programa de carreras, venta de tickets, transferencias y retiros. Backend en Lovable Cloud (Postgres + Auth + Storage).

## Alcance del MVP

**Incluido en esta primera entrega:**
1. **Autenticación**: registro público (rol Jugador por defecto), login, recuperación de contraseña.
2. **Panel Administrador**: CRUD de Agencias, Bancos, Hipódromos; asignar roles (Jugador → Agencia/Admin); ver todos los usuarios; aprobar/rechazar transferencias y retiros.
3. **Panel Agencia**: ver sus jugadores asignados; configurar condiciones/dividendos por hipódromo; ver ventas de sus jugadores.
4. **Panel Jugador**: ver saldo, hipódromos activos, programa de carreras; comprar tickets (Ganador, Placé, Show y combinadas básicas); ver historial de jugadas y premios; solicitar depósitos (transferencias) y retiros.
5. **Programa y resultados**: Admin/Agencia carga programa por hipódromo/carrera, ingresa resultados, el sistema calcula premios y acredita saldos.
6. **Movimientos**: transferencias (depósitos con captura), retiros, auditoría básica.

**Fuera del alcance de esta primera entrega** (se puede añadir después): pollas hípicas completas con puntos, pagos de alquiler semanales de agencias, tipos de apuestas exóticas complejas (Exacta, Trifecta múltiples), reportes avanzados.

## Arquitectura

- **Frontend**: TanStack Start + React + Tailwind + shadcn.
- **Backend**: Lovable Cloud (Postgres, Auth email/password, Storage para capturas de transferencia).
- **Autorización**: tabla `user_roles` separada + función `has_role()` SECURITY DEFINER; RLS en todas las tablas.

## Modelo de datos (Postgres, adaptado del MySQL enviado)

Tablas principales:
- `profiles` (id → auth.users, name, pseudonimo, identity_card, phone, bank_id, agency_id, number_account, balance, block_balance)
- `user_roles` (user_id, role: 'admin' | 'agency' | 'player')
- `banks` (id, name, activo)
- `agencys` (id, name, porcentaje, bank_id, phone, rif, activo)
- `hipodromos` (idhip, nombre, activo, nrocarreras, nrocaballos, cos_bol, divmax, ...)
- `condiciones` (idhip, idage, cos_bol, divmin, divmax, empate, ...)
- `dividendos` (idhip, idage, desde/hasta/fijo/adicional para W/P/S)
- `programa` (idprog, idhip, carrera, fechac, horac, nrocab, cabgan, divgan, ...)
- `detprog` (id, idprog, nroejem, nombreeje, retirado, dividendos por posición)
- `ventas_cab` (id_venta, serial, user_id, agency_id, fecha_hora, total_apostado, status)
- `ventas_det` (id_venta, idhip, carrera, tipo_apuesta, combinacion, monto_jugado, estado, premio_bs)
- `transfers` (user_id, from_bank, to_bank, reference, amount, status, capture_url, date)
- `withdrawals` (user_id, amount, bank_id, account_number, status, reference_payment)
- `auditoria_movimientos` (user_id, accion, ip, fecha)

Todas con RLS. GRANTs a `authenticated` y `service_role` en cada tabla del schema `public`.

Políticas resumidas:
- Admin: acceso total vía `has_role(auth.uid(), 'admin')`.
- Agencia: ve/edita sus propios registros y los jugadores donde `profiles.agency_id = <su agencia>`.
- Jugador: solo sus propios registros (`user_id = auth.uid()`).
- Catálogos (banks, hipódromos, programa activo): SELECT para `authenticated`.

## Flujo de roles

- Al registrarse, cualquier usuario obtiene rol `player` automáticamente (trigger `on_auth_user_created` crea `profiles` + `user_roles`).
- El Admin desde su panel promueve usuarios a `agency` o `admin` (INSERT/DELETE en `user_roles`).
- Cuando un usuario es `agency`, el Admin también le asigna un registro en `agencys` y vincula su `profiles.agency_id`.

## Rutas de la app

Públicas:
- `/` — landing (breve, con CTA a login/registro y explicación).
- `/auth` — login + registro (tabs).
- `/reset-password` — cambiar contraseña tras recovery.

Protegidas (`/_authenticated/*`):
- `/dashboard` — redirige al dashboard según rol.
- `/admin/agencies`, `/admin/banks`, `/admin/hipodromos`, `/admin/users`, `/admin/transfers`, `/admin/withdrawals`, `/admin/programa`.
- `/agency/players`, `/agency/condiciones`, `/agency/ventas`.
- `/player/hipodromos`, `/player/apostar/$idhip/$fecha`, `/player/mis-jugadas`, `/player/deposito`, `/player/retiro`, `/player/perfil`.

## Diseño

Estética moderna orientada al mundo hípico: fondo oscuro con acentos verde esmeralda/dorado, tipografía sans (Inter/Space Grotesk), tarjetas con bordes sutiles y estados claros (pendiente/ganador/perdedor). Todo el diseño vía tokens semánticos en `src/styles.css`.

## Detalles técnicos

- Se habilita Lovable Cloud y se crean todas las tablas + RLS + trigger de auto-perfil + función `has_role` en una migración.
- Server functions (`createServerFn` + `requireSupabaseAuth`) para: promover rol, calcular premios de una carrera, aprobar transferencia (acreditar saldo), aprobar retiro (debitar saldo), registrar venta con validación de saldo.
- Storage bucket `transfer-captures` (privado, políticas: usuario sube y ve las suyas; admin ve todas).
- El registro de venta usa transacción SQL para bloquear saldo del jugador y crear `ventas_cab` + `ventas_det`.

## Pasos de implementación

1. Habilitar Lovable Cloud.
2. Migración inicial: tablas, roles, RLS, GRANTs, trigger de perfil, función `has_role`, bucket de storage. Seed de bancos venezolanos y un hipódromo de ejemplo (La Rinconada).
3. Sistema de diseño (`styles.css` + tokens hípicos).
4. Auth (login/registro/reset) + layout protegido + redirección por rol.
5. Panel Admin (Agencias → Bancos → Hipódromos → Usuarios/roles → Transferencias → Retiros → Programa).
6. Panel Agencia (jugadores, condiciones, ventas).
7. Panel Jugador (hipódromos, apuestas, historial, depósito/retiro, perfil).
8. Motor de premios + acreditación de saldos.
9. Landing + `sitemap.xml` + `robots.txt` + metadata SEO.

## Notas

- Es un MVP grande: lo entregaré por capas funcionales, empezando por auth + admin de agencias en la primera iteración de código, y avanzando con el resto en las siguientes. Al terminar cada capa te aviso para que puedas probar.
- Si prefieres que arranque solo con **login + CRUD de agencias** (lo que pediste literal en los puntos 1 y 2) y dejemos el resto para siguientes tandas, dímelo y ajusto — sería mucho más rápido de ver funcionando.
