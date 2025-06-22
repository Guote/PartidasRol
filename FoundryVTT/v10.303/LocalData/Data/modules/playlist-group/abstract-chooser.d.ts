declare type Model<DATA> = {
    id: number;
    buttonsTemplate: () => string;
    worldIconTemplate: () => string;
    worldLabelTemplate: () => string;
    actions: Actions<DATA>;
    data: DATA;
};
declare type Actions<DATA> = {
    name: 'yes' | 'no' | 'previous';
    label: string;
    icon: string;
    type: 'submit' | 'button';
    callback: (data?: DATA) => void;
}[];
export declare abstract class AbstractChooser<DATA, MODEL = {}> extends FormApplication<FormApplicationOptions, FormApplication.Data<DATA, FormApplicationOptions>> {
    protected model: Model<DATA> & MODEL;
    protected constructor(object: DATA, options?: Partial<FormApplicationOptions>);
    static get defaultOptions(): FormApplicationOptions;
    close(options?: object): Promise<void>;
    protected _onSubmit(event: Event, options?: FormApplication.OnSubmitOptions): Promise<Partial<Record<string, unknown>>>;
    protected _getSubmitData(_updateData?: object): any;
    getData(): any;
    activateListeners(html: JQuery): void;
    protected handleClick(html: JQuery, selector: string, handler: (event: JQuery.ClickEvent) => void): void;
    protected handleChange(html: JQuery, selector: string, handler: (event: JQuery.ChangeEvent) => void): void;
    protected handleInput(html: JQuery, selector: string, handler: (event: JQuery.EventBase) => void): void;
    protected _updateObject(_event: Event, _formData: object | undefined): Promise<void>;
    protected no(): void;
    protected abstract isValid(data: DATA): boolean;
    protected abstract yes(data: DATA): any;
    private getInitModel;
}
export {};
