# Constantes de trabajo

> Cómo quiere laburar el usuario. Las gestiona Refiner. Se inyectan en cada request.
> Formato: cada constante es una sección `## <id>: <título>` con `- estado:` (activa|inactiva) y `- detalle:`.
> Las constantes ACTIVAS se inyectan automáticamente en el system prompt de cada request (efecto inmediato, sin recargar OpenCode).
> Al editar a mano: las continuaciones del detalle van indentadas con 2 espacios. Una línea que empiece con `- ` o `## ` SIN indentar se interpreta como propiedad nueva o sección nueva.

> Ejemplo de formato (referencia — borrar al crear la primera constante):
>
> ```
> ## const-001: No tocar servidores
> - estado: activa
> - detalle: No ejecutar comandos destructivos ni tocar los servidores de producción.
> ```