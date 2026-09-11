# MOTOR DE INGENIERÍA VISUAL — PRESTA YA

**Estado:** activo
**Propósito:** convertir la calidad visual e intuitiva de Presta Ya en un proceso repetible, verificable y acumulativo.

## Cadena de mejora

1. Leer `docs/BIBLIA_PRESTA_YA.md` antes de cualquier cambio.
2. Revisar la UI actual antes de rediseñar.
3. Definir una referencia visual y una lista de criterios medibles.
4. Ejecutar el verificador visual sobre los roles Cliente, Cobrador, Supervisor y Administrador.
5. Detectar problemas de jerarquía, densidad, legibilidad, espaciado, responsive, overflow y consistencia.
6. Aplicar una mejora concreta al código.
7. Volver a ejecutar la verificación.
8. Conservar la versión que mejore sin romper permisos ni funcionalidad.
9. Registrar cambios relevantes en este documento o en la Biblia.

## Principios visuales

- La información más importante debe verse sin buscarla.
- El usuario debe entender qué puede hacer desde el primer vistazo.
- Las acciones primarias deben distinguirse claramente de acciones destructivas.
- El estado de un préstamo debe ser visible mediante texto y tratamiento visual; nunca depender únicamente del color.
- Los números de cliente y préstamo deben tener jerarquía clara.
- En móvil, las acciones esenciales deben seguir siendo accesibles sin zoom ni desplazamiento horizontal innecesario.
- No introducir animaciones, sombras o adornos que compitan con datos financieros.
- Cliente y personal administrativo comparten lenguaje visual, pero no deben compartir una navegación que confunda sus responsabilidades.

## Roles que se verifican

- `admin`: visión completa y acciones administrativas.
- `supervisor`: supervisión, revisión y aprobación según permisos.
- `collector`: operación de cobranza y registro, sin aprobación administrativa.
- `client`: únicamente información propia.

## Regla de referencia

Una comparación automática solo es válida si existe una imagen de referencia versionada en `qa/reference/`. Si no existe, el sistema ejecuta pruebas visuales estructurales y captura nuevas pantallas como artefactos; no debe inventar una referencia.

## Qué NO hace el agente

El verificador no tiene permiso para modificar el código de producción por sí solo. Puede detectar, medir, capturar y reportar. Las modificaciones automáticas de código mediante un modelo externo requieren credenciales y una política de aprobación explícita; no se habilitan por defecto para evitar cambios no revisados en un sistema financiero.

## Definition of Done visual

Una pantalla se considera visualmente lista cuando:

- no tiene overflow horizontal en los viewports definidos;
- no tiene elementos interactivos ocultos o inutilizables;
- conserva jerarquía visual clara;
- pasa las comprobaciones de navegación y roles;
- su captura coincide con la referencia dentro del umbral definido, cuando existe referencia;
- los cambios no reducen la claridad de otra pantalla o rol.
