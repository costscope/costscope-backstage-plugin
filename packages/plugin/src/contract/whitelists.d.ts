/**
 * Whitelists of required & optional fields per mock endpoint. These reflect the
 * minimal UI surface we currently consume. Tests use these to assert that the
 * mock server does not drift or introduce unexpected fields (accidental bloat).
 *
 * If the UI starts using a previously optional field – move it to `required`.
 */
export interface FieldWhitelist {
    required: readonly string[];
    optional: readonly string[];
}
export declare const providersWhitelist: FieldWhitelist;
export declare const datasetsWhitelist: FieldWhitelist;
export declare const summaryWhitelist: FieldWhitelist;
export declare const breakdownWhitelist: FieldWhitelist;
export declare const alertsWhitelist: FieldWhitelist;
export declare const healthWhitelist: FieldWhitelist;
export declare const whitelistByPath: Record<string, FieldWhitelist>;
