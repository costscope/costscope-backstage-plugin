declare namespace _default {
    namespace meta {
        let type: string;
        namespace docs {
            let description: string;
        }
        let schema: never[];
        namespace messages {
            let noWildcard: string;
        }
    }
    function create(context: any): {
        ExportAllDeclaration?: undefined;
    } | {
        ExportAllDeclaration(node: any): void;
    };
}
export default _default;
