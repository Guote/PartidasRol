
const vertex = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;

void main(void)
{
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}
`;

const fragment = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec3 originalColor;
uniform float epsilon;
void main(void) {
    vec4 currentColor = texture2D(uSampler, vTextureCoord);
    vec3 colorDiff = originalColor - (currentColor.rgb / max(currentColor.a, 0.0000000001));
    float colorDistance = length(colorDiff);
    float doReplace = step(colorDistance, epsilon);
    gl_FragColor = mix(currentColor,vec4(0.0,0.0,0.0,0.0), doReplace);
    
}
`;


const fragmenta2c = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec3 newColor;
uniform float epsilon;
void main(void) {
    vec4 currentColor = texture2D(uSampler, vTextureCoord);
    float doReplace = step(currentColor.a, epsilon);
    gl_FragColor = mix(currentColor,vec4(newColor,1.0), doReplace);
    //gl_FragColor = mix(vec4(currentColor.rgb,1.0),vec4(0.0,0.0,0.0,1.0),doReplace);
    //gl_FragColor = vec4(0.0,1.0,1.0,1.0);
    
}
`;


/**
 * ColorReplaceFilter, originally by mishaa, updated by timetocode
 * http://www.html5gamedevs.com/topic/10640-outline-a-sprite-change-certain-colors/?p=69966<br>
 * ![original](../tools/screenshots/dist/original.png)![filter](../tools/screenshots/dist/color-replace.png)
 *
 * @class
 * @extends PIXI.Filter
 * @memberof PIXI.filters
 * @see {@link https://www.npmjs.com/package/@pixi/filter-color-replace|@pixi/filter-color-replace}
 * @see {@link https://www.npmjs.com/package/pixi-filters|pixi-filters}
 * @param {number|Array<number>} [originalColor=0xFF0000] The color that will be changed, as a 3 component RGB e.g. [1.0, 1.0, 1.0]
 * @param {number} [epsilon=0.4] Tolerance/sensitivity of the floating-point comparison between colors (lower = more exact, higher = more inclusive)
 *
 * @example
 *  // replaces true red with true blue
 *  someSprite.filters = [new ColorReplaceFilter(
 *   [1, 0, 0],
 *   [0, 0, 1],
 *   0.001
 *   )];
 *  // replaces the RGB color 220, 220, 220 with the RGB color 225, 200, 215
 *  someOtherSprite.filters = [new ColorReplaceFilter(
 *   [220/255.0, 220/255.0, 220/255.0],
 *   [225/255.0, 200/255.0, 215/255.0],
 *   0.001
 *   )];
 *  // replaces the RGB color 220, 220, 220 with the RGB color 225, 200, 215
 *  someOtherSprite.filters = [new ColorReplaceFilter(0xdcdcdc, 0xe1c8d7, 0.001)];
 *
 */


class AlphaToColorFilter extends PIXI.Filter {

    constructor(newColor = 0xFF0000,  epsilon = 0.4) {
        super(vertex, fragmenta2c);
        this.uniforms.newColor = new Float32Array(3);
        this.newColor = newColor;
        this.epsilon = epsilon;
        //console.log("NewColor",this.uniforms.newColor,this.newColor)
    }

    /**
     * The color that will be changed, as a 3 component RGB e.g. [1.0, 1.0, 1.0]
     * @member {number|Array<number>}
     * @default 0xFF0000
     */
    set newColor(value) {
        let arr = this.uniforms.newColor;
        //console.log(typeof value)
        if (typeof value === 'number') {
            PIXI.utils.hex2rgb(value, arr);
            //console.log("Here",value,arr)
            this._newColor = value;
        }
        else {
            arr[0] = value[0];
            arr[1] = value[1];
            arr[2] = value[2];
            this._newColor = PIXI.utils.rgb2hex(arr);
        }
    }
    get newColor() {
        return this._newColor;
    }



    /**
     * Tolerance/sensitivity of the floating-point comparison between colors (lower = more exact, higher = more inclusive)
     * @member {number}
     * @default 0.4
     */
    set epsilon(value) {
        this.uniforms.epsilon = value;
    }
    get epsilon() {
        return this.uniforms.epsilon;
    }
}



class ColorToAlphaFilter extends PIXI.Filter {

    constructor(originalColor = 0xFF0000,  epsilon = 0.4) {
        super(vertex, fragment);
        this.uniforms.originalColor = new Float32Array(3);
        this.originalColor = originalColor;
        this.epsilon = epsilon;
        //console.log("Orig",this.uniforms.originalColor,this.originalColor)
    }

    /**
     * The color that will be changed, as a 3 component RGB e.g. [1.0, 1.0, 1.0]
     * @member {number|Array<number>}
     * @default 0xFF0000
     */
    set originalColor(value) {
        let arr = this.uniforms.originalColor;
        //console.log(typeof value)
        if (typeof value === 'number') {
            PIXI.utils.hex2rgb(value, arr);
            //console.log("Here",value,arr)
            this._originalColor = value;
        }
        else {
            arr[0] = value[0];
            arr[1] = value[1];
            arr[2] = value[2];
            this._originalColor = PIXI.utils.rgb2hex(arr);
        }
    }
    get originalColor() {
        return this._originalColor;
    }



    /**
     * Tolerance/sensitivity of the floating-point comparison between colors (lower = more exact, higher = more inclusive)
     * @member {number}
     * @default 0.4
     */
    set epsilon(value) {
        this.uniforms.epsilon = value;
    }
    get epsilon() {
        return this.uniforms.epsilon;
    }
}

export {AlphaToColorFilter, ColorToAlphaFilter };
