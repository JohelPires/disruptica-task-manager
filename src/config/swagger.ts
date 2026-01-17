import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { env } from './env'

/**
 * Load OpenAPI specification from YAML file and inject environment-specific values
 */
function loadOpenAPISpec(): any {
    const yamlPath = path.join(process.cwd(), 'openapi.yaml')
    const yamlContent = fs.readFileSync(yamlPath, 'utf8')
    const spec = yaml.load(yamlContent) as any

    // Inject environment-specific server URLs
    const servers = [
        // Production/server URL from environment (if provided)
        ...(process.env.API_BASE_URL
            ? [
                  {
                      url: process.env.API_BASE_URL,
                      description: 'Production server',
                  },
              ]
            : []),
        // Development server (always include for local development)
        {
            url: `http://localhost:${env.PORT}`,
            description: 'Development server',
        },
    ]

    spec.servers = servers

    return spec
}

export const swaggerSpec = loadOpenAPISpec()
