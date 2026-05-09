El flujo para configurar una terminal es:

En la app (Configuración)

Ir a Configuración → sección "Pagos con MercadoPago"
Asegurarse de que el campo "Access Token" esté guardado (es el token de producción de la cuenta MP del local, empieza con APP_USR-...)
Hacer clic en "+ Agregar Terminal"
Poner un nombre descriptivo, ej: Caja Principal
En el campo "POS ID (Device ID)" — aquí es donde necesitas el dato de MP
Cómo obtener el Device ID de la terminal Point

El posId es el identificador del dispositivo físico dentro de MercadoPago. Para obtenerlo:

Opción A — Panel de MP:

Entrar a mercadopago.com.mx con la cuenta del local
Ir a Herramientas para desarrolladores → Tus integraciones → Point
O en el portal: mercadopago.com.mx/point/integrations
Los dispositivos aparecer listados con su ID, que tiene formato: PAX_A910__SMARTPOS1234567890
Opción B — Via API (más confiable):
Con el access token del local, hacer este GET directamente desde el navegador o Postman:


GET https://api.mercadopago.com/point/integration-api/devices
Authorization: Bearer APP_USR-tu-access-token-aqui
Devuelve la lista de dispositivos con sus IDs exactos.

Checklist para mañana en el local:

 Tener a la mano el access token de producción de la cuenta MP del negocio
 La terminal Point tiene que estar encendida y conectada (WiFi o datos)
 La terminal debe estar en modo integrado (no en modo standalone) — en el menú del dispositivo: Configuración → Modo de operación → Integrado
 Obtener el Device ID con uno de los métodos arriba
 Entrar a Configuración en la app, guardar el access token y agregar la terminal con su ID
 Hacer una venta de prueba de $1 para verificar que la terminal responde