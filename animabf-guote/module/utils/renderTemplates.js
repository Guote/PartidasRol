/**
 * Accept multiple rendering templates and returns it rendered
 * @param templates
 */
export const renderTemplates = (...templates) => {
    return Promise.all(templates.map(template => renderTemplate(template.name, template.context ?? {})));
};
