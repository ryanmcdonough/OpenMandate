// src/mandate/parser.ts
// YAML → validated Mandate object

import { readFileSync } from "fs";
import YAML from "yaml";
import { MandateSchema, type Mandate } from "./schema.js";

export class MandateParser {
    /**
     * Parse a YAML mandate file into a validated Mandate object.
     * Throws ZodError if validation fails.
     */
    static fromFile(filePath: string): Mandate {
        const raw = readFileSync(filePath, "utf-8");
        return MandateParser.fromString(raw);
    }

    static fromString(yamlString: string): Mandate {
        const parsed = YAML.parse(yamlString);
        return MandateSchema.parse(parsed);
    }

    /**
     * Validate without throwing — returns result with errors.
     */
    static validate(filePath: string): { success: boolean; data?: Mandate; errors?: string[] } {
        try {
            const mandate = MandateParser.fromFile(filePath);
            return { success: true, data: mandate };
        } catch (error: any) {
            if (error.issues) {
                return {
                    success: false,
                    errors: error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`),
                };
            }
            return { success: false, errors: [error.message] };
        }
    }
}
