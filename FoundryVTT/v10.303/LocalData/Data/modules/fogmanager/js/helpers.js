
/**
 * Converts an object containing coordinate pair arrays into a single array of points for PIXI
 * @param hex {Object}  An object containing a set of [x,y] pairs
 */
export function hexObjsToArr(hex) {
  const a = [];
  hex.forEach((point) => {
    a.push(point.x);
    a.push(point.y);
  });
  // Append first point to end of array to complete the shape
  a.push(hex[0].x);
  a.push(hex[0].y);
  return a;
}



export async function base64_to_sprite(base64) {
  // Parse base64 encoded data back to a sprite.
  // Based on code in foundry.js
  return await new Promise(resolve => {
    let tex = PIXI.Texture.from(base64);
    if (tex.baseTexture.valid) {
      resolve(tex);
    }
    else tex.on("update", tex => {
      resolve(tex);
    });
  });
}

/**
 * Dumps a render of a given pixi container or texture to a new tab
 */
var prev_section = ""

export function pixiDump(data = null, color = "red", title = "", this_section = "") {

  if (!CONFIG.debug.fogmanagertriage) return

  //If passing in an raw PIXI object, decode it first, since the browser takes base64 encode images for inline usage
  if (!(typeof data === 'string' ||  data instanceof String))  
    data = canvas.app.renderer.extract.base64(data);

  
  const win = window.open("", "PIXI Debug Output");
  win.scroll()
  if (win.document.body == null)  win.document.write("-") // Start the document with something, since this clears the head

  if (win.document.head.innerHTML.length <= 20) {
    win.document.head.innerHTML  += `<style>
      .images {
        position: relative;
        display: inline-block;
      }
      
      .images p {
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: 0;
        left: 0;
        margin: 0;
      }
      .section div {
        border: 1px solid green;
        
      }
      body {background-color: lightblue;}
      </style>`
  }

  if (this_section !=  prev_section || (this_section != "" && win.document.body.innerHTML.length <10 )){
    //if(prev_section != "") 
    win.document.write("</div>")
    win.document.write('<div class="section">')  
    prev_section = this_section
  }


  win.document.write(
    `<div class="images">
   <img height="200" style="border: 1px solid ${color};"  src='${data}' title=${title}/>
   <p style="color:red;">${title}</p>
   </div>
   `);
   
   // Scroll to the bottom!
   win.scrollTo(0, win.document.body.scrollHeight);
}





export var fogManagerLog = {}

function setLogger(isDebug) {
  let version = ""
  if (hasProperty(game, 'modules'))
    version = game.modules.get('fogmanager').data.version

  const name = "Fog Manager"
  const LOG_PREFIX = ["%c" + name + "%c " + version + " - LOG -", 'background: #bada55; color: #222', '']
  const DEBUG_PREFIX = ["%c" + name + "%c " + version + " - DEBUG -", 'background: #FF9900; color: #222', '']
  const ERROR_PREFIX = ["%" + name + "%c " + version + " - ERROR -", 'background: #bada55; color: #FF0000', '']
  const WARN_PREFIX = ["%" + name + "%c " + version + " - WARN -", 'background: #bada55; color: #FF0000', '']

  if (isDebug) {
    fogManagerLog = {

      info: window.console.info.bind(window.console, ...LOG_PREFIX),
      log: window.console.log.bind(window.console, ...LOG_PREFIX),
      debug: window.console.debug.bind(window.console, ...DEBUG_PREFIX),
      warn: window.console.warn.bind(window.console, ...WARN_PREFIX),
      error: window.console.error.bind(window.console, ...ERROR_PREFIX),


    };
  } else {
    var __no_op = function () { };

    fogManagerLog = {
      info: __no_op,
      log: __no_op,
      debug: __no_op,
      warn: __no_op,
      error: __no_op,
    }
  }
}

var fogmanager = false

Object.defineProperty(CONFIG.debug, 'fogmanager', {
  get: function () { return fogmanager; },
  set: function (v) {
    fogmanager = v;
    setLogger(v);
  }
});

setLogger(false)

