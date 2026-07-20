// Отдельный модуль без "use client": константу импортируют и серверный layout
// (инлайн-сниппет в <head>), и клиентский компонент MetaPixel. Импорт значения
// из client-модуля в серверный компонент дал бы client reference → "[object Object]".
export const META_PIXEL_ID = "2222890605164366";
