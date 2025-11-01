declare namespace _default {
    namespace meta {
        let type: string;
        namespace docs {
            let description: string;
        }
        let schema: never[];
        namespace messages {
            let noDirect: string;
        }
    }
    function create(context: any): {
        Literal(node: any): void;
        TemplateElement(node: any): void;
    };
}
export default _default;
