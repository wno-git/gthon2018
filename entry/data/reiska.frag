#define PROCESSING_COLOR_SHADER

varying vec4 vertColor;
varying vec4 vertTexCoord;

uniform vec2 resolution;
uniform float U_TIME;
uniform float U_CAMROT_X;
uniform float U_CAMROT_Y;
uniform float U_CAMROT_Z;

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

struct Material {
    vec3 color;
    float ambient;
    float diffuse;
    float specular;
    float shininess;
};

struct Light {
    vec3 position;
    vec3 diffuse;
    vec3 specular;
};

/* GLOBALS */

const float GAMMA = 2.2;

vec3 gammaDecode(vec3 color) {
    return pow(color, vec3(GAMMA));
}

vec3 gammaEncode(vec3 color) {
    return pow(color, vec3(1.0 / GAMMA));
}

/* COLORS */

vec3 PURPLE_SRGB = vec3((146.0/255.0), (7.0/255.0), 255.0);
vec3 ORANGERED_SRGB = vec3(1.0, (45.0/255.0), 0);

vec3 PURPLE = gammaDecode(PURPLE_SRGB);
vec3 ORANGERED = gammaDecode(ORANGERED_SRGB);
vec3 GREEN_MAX = vec3(0, 1, 0);

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

float sphereSDF(vec3 pos, float radius, vec3 p) {
    return length(p - pos) - radius;
}

float cubeSDF(vec3 pos, vec3 radius, vec3 p) {
    p -= pos;
    return length(max(abs(p) - radius, 0));
}

// SDF OPS
//
// These are mostly based on
// http://iquilezles.org/www/articles/distfunctions/distfunctions.htm
// and with some help from
// http://mercury.sexy/hg_sdf/
//
// Though, some of these I implemented from scratch based on some other
// tutorials. Expect mistakes.

vec3 opTranslate(vec3 p, vec3 dir) {
    return p - dir;
}

vec3 opRotation(vec3 axis, float angle, vec3 p) {
    // ref: https://paroj.github.io/gltut/Positioning/Tut06%20Rotation.html

    float c = cos(angle);
    float s = sin(angle);
    float ic = 1 - c;

    float x = axis.x;
    float y = axis.y;
    float z = axis.z;

    vec3 axis2 = pow(axis, vec3(2, 2, 2));

    float x2 = axis2.x;
    float y2 = axis2.y;
    float z2 = axis2.z;

    mat3 rot = mat3(
        x2 + (1 - x2) * c, ic * x * y + z * s, ic * x * z - y * s,
        ic * x * y - z * s, y2 + (1 - y2) * c, ic * y * z + x * s,
        ic * x * z + y * s, ic * y * z - x * s, z2 + (1 - z2) * c
    );

    return inverse(rot) * p;
}

float opRepeat(float p, float size) {
    return mod(p - 0.5*size, size) - 0.5 * size;
}

float sceneSDF(vec3 p) {
    p = opTranslate(p, vec3(0, 0, -5));

    p = opTranslate(p, vec3(0, 0, U_TIME));

    p.x = opRepeat(p.x, 2);
    p.y = opRepeat(p.y, 2);
    p.z = opRepeat(p.z, 2);

    //vec3 p1 = opRotation(vec3(0.3, 1, 0.1), U_TIME*1.3, p);

    float cube = cubeSDF(vec3(0, 0, 0), vec3(1), p);
    float sphere = sphereSDF(vec3(0, 0, 0), 1.4, p);

    return max(-sphere, cube);
}

// ref: http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
float raymarch(Ray ray) {
    const float FAR = 100.0;
    const float EPSILON = 0.001;
    const int STEPS_MAX = 100;
    const float NO_HIT = -1.0;

    float dist = 0.0;
    for (int i = 0; i < STEPS_MAX; ++i) {
        vec3 march = ray.origin + ray.direction * dist;

        float dist_closest = sceneSDF(march);

        if (dist_closest < EPSILON) return dist;

        dist += dist_closest;

        if (dist > FAR) return NO_HIT;
    }

    return NO_HIT;
}

vec3 gradient(vec3 hit) {
    float EPSILON = 0.0001;

    vec3 ex = EPSILON * vec3(1, 0, 0);
    float dx = sceneSDF(hit + ex) - sceneSDF(hit - ex);

    vec3 ey = EPSILON * vec3(0, 1, 0);
    float dy = sceneSDF(hit + ey) - sceneSDF(hit - ey);

    vec3 ez = EPSILON * vec3(0, 0, 1);
    float dz = sceneSDF(hit + ez) - sceneSDF(hit - ez);

    return normalize(vec3(dx, dy, dz));
}

vec3 phong(Material material, vec3 to_camera, vec3 normal, vec3 ambient, Light light) {
    const vec3 ill_ambient = material.ambient * ambient;

    const vec3 light_dir = normalize(light.position);

    vec3 ill_diffuse =
        material.diffuse *
            dot(normal, light_dir) * light.diffuse;

    vec3 reflection = reflect(-light_dir, normal);

    vec3 ill_specular = vec3(0);

    // TODO: this code could be simplified with some clamp() like in
    // https://paroj.github.io/gltut/Illumination/Tut11%20Phong%20Model.html

    if (dot(light_dir, normal) > 0) {
        ill_specular =
            material.specular *
                pow(dot(reflection, to_camera), material.shininess) *
                    light.specular;
    }

    // TODO: the specular component should get its color from the light, not
    // material, I believe
    return material.color * ill_ambient +
        material.color * ill_diffuse +
        material.color * ill_specular;
}

vec3 drawBackground(Ray ray) {
    // horizon
    if (ray.direction.y > 0) {
        return vec3(0.0, 0.0, 0.7);
    } else {
        return vec3(0.3, 0.3, 0.3);
    }
}

vec2 pixelizeCoord(vec2 coord, float size) {
    return floor(coord * size) / size;
}

float distanceBlend(float hitDistance, float depth) {
    // visualize distance
    // could be used as fog too
    if (hitDistance < 0) {
        return vec3(0);
    } else {
        return vec3(1.0 - smoothstep(0, depth, hitDistance));
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

    Material sphereMaterial = Material(
        ORANGERED,
        1.0,
        1.0,
        1.0,
        7
    );

    vec3 ambient = vec3(0.1, 0.1, 0.1);

    Light light = Light(
        vec3(1.0, 1.0, 1.0),
        vec3(0.3, 0.3, 0.3),
        vec3(0.2, 0.2, 0.2)
    );

    vec2 viewCoord = fragCoordToView(gl_FragCoord, resolution);

    Ray ray;
    generateRayPerspective(
        camera,
        viewCoord,
        ray);

    float rayhit = raymarch(ray);

    vec3 normal = gradient(ray.origin + ray.direction * rayhit);

    vec3 color = vec3(0);

    if (rayhit < 0) {
        color = drawBackground(ray);
    } else {
        color = phong(
            sphereMaterial,
            -ray.direction,
            normal,
            ambient,
            light);
    }

    // distance fog
    color = color * distanceBlend(rayhit, 10.0);

    color = gammaEncode(color);

    gl_FragColor = vec4(color, 1.0);
}
