# Radar API

Backend Python para servicios de IA de Radar. Las apps leen y escriben reportes directamente en Supabase; esta API prepara borradores y procesa trabajos de matching de objetos perdidos y encontrados.

## Ejecutar

```bash
uv run uvicorn main:app --reload
```

La API queda disponible en `http://127.0.0.1:8000`.

## Documentación Swagger

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

En Swagger UI, usa el botón `Authorize` e ingresa el valor de `BACKEND_API_KEY`. La API lo envía como encabezado `X-API-Key`.

## Pruebas

```bash
uv run pytest
```
