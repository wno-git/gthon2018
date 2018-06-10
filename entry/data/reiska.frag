#version 450
#define PROCESSING_COLOR_SHADER

varying vec4 vertColor;
varying vec4 vertTexCoord;

out vec4 fragColor;

uniform vec2 resolution;
uniform float U_TIME;
uniform float U_BEAT;
uniform float U_CAMROT_X;
uniform float U_CAMROT_Y;
uniform float U_CAMROT_Z;
uniform float U_CAMPOS_X;
uniform float U_CAMPOS_Z;
uniform float U_FOVADJUST;
uniform float U_TUNNEL_DISTANCE;
uniform float U_TUNNEL_WIDTH;
uniform float U_TUNNEL_BLINK;
uniform float U_FOG_DISTANCE;
uniform float U_BLOB_DISPLACE;
uniform float U_BLOB_ROTSPEED;
uniform float U_BLOB_BLINK;
uniform float U_BLOB_SPREAD;
uniform float U_BLOB_SHAKE;
uniform float U_BLOB_Z;
uniform float U_FADEOUT;
uniform float U_DEBUG;

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
const float PI = 3.14;

/* PRIMITIVES */

const int PRIMITIVE_TUNNEL = 1;
const int PRIMITIVE_BLOB = 2;

/* GAMMA FUNCS */

vec3 gammaDecode(vec3 color) {
    return pow(color, vec3(GAMMA));
}

vec3 gammaEncode(vec3 color) {
    return pow(color, vec3(1.0 / GAMMA));
}

/* COLOR FUNCS */

vec3 rgb8ToF(int r, int g, int b) {
    return vec3(r, g, b) / 255.0;
}

/* COLORS */

vec3 PURPLE_SRGB = rgb8ToF(146, 7, 255);

vec3 PURPLE = gammaDecode(PURPLE_SRGB);
vec3 ORANGERED = gammaDecode(rgb8ToF(255, 45, 0));
vec3 BLUE = gammaDecode(rgb8ToF(0, 255, 160));
vec3 GREENGOO = gammaDecode(rgb8ToF(20, 204, 31));
vec3 GREEN_MAX = vec3(0, 1, 0);
vec3 WHITE = vec3(1);


/* THINGS */

float getBeat() {
    const float beat_ofs = 0.05;
    return U_BEAT + beat_ofs;
}

float rampCurveDown(float beat, float length) {
    return 1 - mod(beat, length);
}

/* MATERIALS */

Material MATERIAL_TUNNEL = Material(
    mix(ORANGERED, BLUE, rampCurveDown(getBeat(), 3.0) * U_TUNNEL_BLINK),
    1.0,
    1.0,
    0.2,
    7
);

Material MATERIAL_BLOB = Material(
    GREENGOO,
    0.7,
    0.7 + (rampCurveDown(getBeat(), 1.0) * U_BLOB_BLINK),
    1.9,
    30
);

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

float sphereSDF(vec3 p, float radius) {
    return length(p) - radius;
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
// Though, some of these I (re)implemented from scratch based on some other
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

float opIntersect(float a, float b) {
    return max(-a, b);
}

float opDisplaceSine(vec3 p) {
    // http://iquilezles.org/www/articles/distfunctions/distfunctions.htm
    const float f = 40;
    return sin(p.x * f) * sin(p.y * f) * sin(p.z * f);
}


// This function taken verbatim from:
// http://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float smin( float a, float b, float k )
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float blobSDF(vec3 p) {
    //const float blob_size = 0.1 + rampCurveDown(getBeat(), 1.0)*0.1;
    const float blob_size = 0.2;

    // quite a mess creating the blob's like this by hand :/

    const float spread = U_BLOB_SPREAD;

    vec3 p_blob1 = opTranslate(p, vec3(spread, 0, 0));
    float blob1 = sphereSDF(p_blob1, blob_size);

    vec3 p_blob2 = opTranslate(p, vec3(-spread, 0, 0));
    float blob2 = sphereSDF(p_blob2, blob_size);

    vec3 p_blob3 = opTranslate(p, vec3(0, spread, 0));
    float blob3 = sphereSDF(p_blob3, blob_size);

    vec3 p_blob4 = opTranslate(p, vec3(0, -spread, 0));
    float blob4 = sphereSDF(p_blob4, blob_size);

    const float k = 0.03;
    float blob = smin(blob1, smin(blob2, smin(blob3, blob4, k), k), k);

    blob += opDisplaceSine(p) * U_BLOB_DISPLACE;

    return blob;
}

float sceneSDF(vec3 p, inout int primitive_id) {
    p = opRotation(vec3(0, 1, 0), U_CAMROT_Y * PI, p);
    p = opTranslate(p, vec3(U_CAMPOS_X, 0, 0));
    p = opTranslate(p, vec3(0, 0, U_CAMPOS_Z));

    vec3 p_tunnel = p;

    float tunnel_distance = getBeat() * 2.0 + U_TUNNEL_DISTANCE;
    p_tunnel = opTranslate(p, vec3(0, 0, tunnel_distance));

    p_tunnel.x = opRepeat(p_tunnel.x, 2);
    p_tunnel.y = opRepeat(p_tunnel.y, 2);
    p_tunnel.z = opRepeat(p_tunnel.z, 2);

    //vec3 p1 = opRotation(vec3(0.3, 1, 0.1), U_TIME*1.3, p);

    float tunnel_cube = cubeSDF(vec3(0, 0, 0), vec3(1), p_tunnel);

    float tunnel_sphere = sphereSDF(p_tunnel, U_TUNNEL_WIDTH);

    float dist_tunnel = opIntersect(tunnel_sphere, tunnel_cube);

    vec3 p_blob = opTranslate(p, vec3(0, 0, U_BLOB_Z));

    float shake_magic = 0.45;
    float beat_magic = getBeat() * 17;

    p_blob = opTranslate(p_blob,
        vec3(sin(beat_magic),
            sin(beat_magic + shake_magic),
            sin(beat_magic + shake_magic + 0.12)) * U_BLOB_SHAKE);

    p_blob = opRotation(vec3(0, 1, 0),
        getBeat() * 3.14 * U_BLOB_ROTSPEED, p_blob);
    p_blob = opRotation(vec3(0, 0, 1),
        getBeat() * 3.14 * 0.3 * U_BLOB_ROTSPEED, p_blob);

    p_blob = opTranslate(p_blob, vec3(U_DEBUG, 0, 0));

    float dist_blob = blobSDF(p_blob);

    // i'm using this to query which primitive the ray hit, in order to shade
    // different things differently. there may be a much better way to do this

    float dist = 0;

    if (dist_blob < dist_tunnel) {
        primitive_id = PRIMITIVE_BLOB;
        dist = dist_blob;
    } else {
        primitive_id = PRIMITIVE_TUNNEL;
        dist = dist_tunnel;
    }

    return dist;
}

// ref: http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
float raymarch(Ray ray, inout int ray_primitive_id) {
    const float FAR = 100.0;
    const float EPSILON = 0.001;
    const int STEPS_MAX = 100;
    const float NO_HIT = -1.0;

    ray_primitive_id = -1;

    float dist = 0.0;
    for (int i = 0; i < STEPS_MAX; ++i) {
        vec3 march = ray.origin + ray.direction * dist;

        float dist_closest = sceneSDF(march, ray_primitive_id);

        if (dist_closest < EPSILON) return dist;

        dist += dist_closest;

        if (dist > FAR) return NO_HIT;
    }

    return NO_HIT;
}

vec3 gradient(vec3 hit) {
    float EPSILON = 0.0001;

    int zzz = 0; // don't care inout

    vec3 ex = EPSILON * vec3(1, 0, 0);
    float dx = sceneSDF(hit + ex, zzz) - sceneSDF(hit - ex, zzz);

    vec3 ey = EPSILON * vec3(0, 1, 0);
    float dy = sceneSDF(hit + ey, zzz) - sceneSDF(hit - ey, zzz);

    vec3 ez = EPSILON * vec3(0, 0, 1);
    float dz = sceneSDF(hit + ez, zzz) - sceneSDF(hit - ez, zzz);

    return normalize(vec3(dx, dy, dz));
}

vec3 phong(Material material, vec3 to_camera, vec3 normal, vec3 ambient, Light light) {
    const vec3 ill_ambient = material.ambient * ambient;

    const vec3 light_dir = normalize(light.position);

    vec3 ill_diffuse =
        material.diffuse *
            max(dot(normal, light_dir), 0) * light.diffuse;

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
        return 0.0;
    } else {
        return 1.0 - smoothstep(0, depth, hitDistance);
    }
}

Material getMaterial(int primitive_id) {
    int p = primitive_id; // shorthand
    if (p == PRIMITIVE_TUNNEL) {
        return MATERIAL_TUNNEL;
    } else if (p == PRIMITIVE_BLOB) {
        return MATERIAL_BLOB;
    }
}

void main() {
    Camera camera = Camera(
        vec3(0),
        vec3(0, 1, 0),
        vec3(0, 0, -1),
        radians(90.0 * U_FOVADJUST),
        float(resolution.x) / float(resolution.y)
    );

    vec3 ambient = vec3(0.1, 0.1, 0.1);

    Light light = Light(
        vec3(1.0, 1.0, 1.0),
        vec3(0.3, 0.3, 0.3),
        vec3(0.4, 0.4, 0.4)
    );

    vec2 viewCoord = fragCoordToView(gl_FragCoord, resolution);

    Ray ray;
    generateRayPerspective(
        camera,
        viewCoord,
        ray);

    int ray_hit_primitive = 0;
    float ray_hit_distance = raymarch(ray, ray_hit_primitive);

    vec3 normal = gradient(ray.origin + ray.direction * ray_hit_distance);

    vec3 color = vec3(0);

    if (ray_hit_distance < 0) {
        color = drawBackground(ray);
    } else {
        Material material = getMaterial(ray_hit_primitive);
        color = phong(
            material,
            -ray.direction,
            normal,
            ambient,
            light);
    }

    // distance fog
    color = color * distanceBlend(ray_hit_distance, U_FOG_DISTANCE * 10.0);

    // visualize normals
    //color = normal * distanceBlend(ray_hit_distance, U_FOG_DISTANCE * 10.0);

    // beat tracking tuning viz
    //color = vec3(rampCurveDown(getBeat(), 1.0));

    color = mix(color, WHITE, U_FADEOUT);

    color = gammaEncode(color);

    fragColor = vec4(color, 1.0);
}
