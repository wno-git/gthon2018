#define PROCESSING_COLOR_SHADER

varying vec4 vertColor;
varying vec4 vertTexCoord;

uniform vec2 resolution;

const float FAR = 9999;

struct Ray {
    vec3 origin;
    vec3 direction;
};

struct Camera {
    vec3 position;
    vec3 up;
    vec3 forward;
    float fov;
    float aspect;
};

/* generate ray from a perspective camera */
void generateRayPerspective(
        const in Camera camera,
        const in vec2 coords,
        out Ray ray) {
    float d = 1.0 / tan(camera.fov / 2.0);

    ray.origin = camera.position;

    vec3 right = cross(camera.forward, camera.up);

    ray.direction = normalize(
        coords.x * right + 
        (1.0 / camera.aspect) * coords.y * camera.up +
        d * camera.forward
    );
}

vec2 fragCoordToView(const in vec4 fragCoord, const in vec2 resolution) {
    return (fragCoord.xy / resolution.xy) * vec2(2.0) - vec2(1.0);
}

float sphereSDF(vec3 pos, vec3 p) {
    return length(p - pos) - 1.0;
}

float sceneSDF(vec3 p) {
    return sphereSDF(vec3(0, 0, -5), p);
}

float raymarch(Ray ray) {
    const float DIST_MAX = 10.0;
    const float EPSILON = 0.01;

    float dist = 0.0;
    while (dist < DIST_MAX) {
        vec3 march = ray.origin + ray.direction * dist;

        float dist_closest = sceneSDF(march);

        if (dist_closest < EPSILON) {
            return dist;
        }

        dist += dist_closest;
    }

    return -1.0;
}

vec3 drawBackground(Ray ray) {
    // horizon
    if (ray.direction.y > 0) {
        return vec3(0.0, 0.0, 0.7);
    } else {
        return vec3(0.3, 0.3, 0.3);
    }
}

void main() {
    Camera camera = Camera(
        vec3(0),
        vec3(0, 1, 0),
        vec3(0, 0, -1),
        radians(90.0),
        float(resolution.x) / float(resolution.y)
    );

    vec2 viewCoord = fragCoordToView(gl_FragCoord, resolution);

    Ray ray;
    generateRayPerspective(
        camera,
        viewCoord,
        ray);

    float rayhit = raymarch(ray);

    if (rayhit < 0) {
        gl_FragColor = vec4(drawBackground(ray), 1.0);
    } else {
        gl_FragColor = vec4(0, rayhit, 0, 1);
    }

}
