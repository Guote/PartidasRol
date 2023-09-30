//let blob = new Blob(["<html>…</html>"], {type: 'text/html'});
//testfile = new File([blob],"ok.txt")

//await FilePicker.upload("data","",testfile, "")

let selectedComplabel;
let nonmatches;

let pathtomap;
let sourcetomap;
let buckettomap;

let editportrait;
let onlymapempty;
let editboth;
let autohit;
let autohittreshhold;
let manualtie ;
let typetochange;

let manualhit;
let hittreshhold;

let selectedComp;
let backupentries;


let manualconfirmwindows = [];

Hooks.on('ready', async function() {
      game.settings.register('imagemapper', 'defaultmapimages', {
          name : "Map images to:",
          hint : "",
          scope : 'world',
          config : true,
          type: String,
          choices: {           // If choices are defined, the resulting setting will be a select menu
            "portrait": "Portrait",
            "token": "Token",
            "both": "Both"
          },
          default: "both", 
          onChange: value =>  location.reload()
      });
      game.settings.register('imagemapper', 'defaultonlymapmissing', {
          name : "Only map entries that have no/default image:",
          hint : "",
          scope : 'world',
          config : true,
          type: Boolean,
          default: true,
          onChange: value =>  location.reload()
      });
      game.settings.register('imagemapper', 'defaultautomapimagematches', {
          name : "Automatically map image on match:",
          hint : "",
          scope : 'world',
          config : true,
          type: Boolean,
          default: true,
          onChange: value =>  location.reload()
      });
      game.settings.register('imagemapper', 'defaultmapimagepercent', {
          name : "Automatically map image match percent:",
          hint : "",
          scope : 'world',
          config : true,
          type: Number,
          range: {             // If range is specified, the resulting setting will be a range slider
            min: 0,
            max: 100,
            step: 1
          },
          default: 90, 
          onChange: value =>  location.reload()
      });
      game.settings.register('imagemapper', 'defaulttie', {
          name : "On tie:",
          hint : "",
          scope : 'world',
          config : true,
          type: String,
          choices: {           // If choices are defined, the resulting setting will be a select menu
            "manualtie": "Manually choose",
            "randomtie": "randomly choose"
          },
          default: "manualtie",
          onChange: value =>  location.reload()
      });
      game.settings.register('imagemapper', 'defaultmanualmap', {
          name : "Manually map:",
          hint : "",
          scope : 'world',
          config : true,
          type: Boolean,
          default: false,
          onChange: value =>  location.reload()
      });
      game.settings.register('imagemapper', 'defaultmanualmapimagepercent', {
          name : "Manually map image match percent:",
          hint : "",
          scope : 'world',
          config : true,
          type: Number,
          range: {             // If range is specified, the resulting setting will be a range slider
            min: 0,
            max: 100,
            step: 1
          },
          default: 75, 
          onChange: value =>  location.reload()
      });
      game.settings.register('imagemapper', 'savelastimagepath', {
          name : "Save the last used image path as default?",
          hint : "",
          scope : 'world',
          config : true,
          type: Boolean,
          default: true,
          onChange: value =>  location.reload()
      });
      game.settings.register('imagemapper', 'sourceinputdefault', {
          name : "sourceinputdefault",
          hint : "",
          scope : 'world',
          config : false,
          type: String,
          default: ""
      });
      game.settings.register('imagemapper', 'bucketinputdefault', {
          name : "bucketinput",
          hint : "",
          scope : 'world',
          config : false,
          type: String,
          default: ""
      });
      game.settings.register('imagemapper', 'pathinputdefault', {
          name : "pathinputdefault",
          hint : "",
          scope : 'world',
          config : false,
          type: String,
          default: ""
      });
});

export class ImageOptions extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      classes: ["imageoptions"],
      template: "modules/imagemapper/templates/mapperpicker.html",
      width: 800,
      height: 630,
      resizable: true,
      minimizable: false,
      title: "Confirm image",
    });
    return options;
  }

  //open next picker on close
  async close(openpicker = true) {
    const states = Application.RENDER_STATES;
    if (this._state !== states.RENDERED) return;
    this._state = states.CLOSING;

    // Get the element
    let el = this.element;
    el.css({ minHeight: 0 });

    // Dispatch Hooks for closing the base and subclass applications
    const base = this.options.baseApplication;
    if (base && base !== this.constructor.name) {
      Hooks.call(`close${base}`, this, el);
    }
    Hooks.call("close" + this.constructor.name, this, el);

    if (openpicker) {
      openpickers();
    }

    // Animate closing the element
    return new Promise((resolve) => {
      el.slideUp(200, () => {
        el.remove();

        // Clean up data
        this._element = null;
        delete ui.windows[this.appId];
        this._minimized = false;
        this._scrollPositions = null;
        this._state = states.CLOSED;
        resolve();
      });
    });
  }

  //send data
  async workaround(extradata) {
    
    this.hits = extradata.hits;
    this.newtitle = extradata.entry.name;
    this.entry = extradata.entry;
    await this.render(true);
  }

  async _render(force = false, options = {}) {
    // Stuff Before rendering
    await super._render(force, options);
    // Stuff After rendering

    //populate app with correct data
    let currentapp = $("#" + this.id);

    //set title to monster being edited
    let oldtitle = currentapp.find("#newtitle")[0];
    oldtitle.innerHTML = this.newtitle;

    //fill imagecontainer with the different images
    let imagecontainer = currentapp.find("#imagelister")[0];
    let firstimg = true;
    currentapp = this;
    this.hits.forEach((e) => {
      let newimageboxborder = document.createElement("div");
      newimageboxborder.className = "imageboxborder";
      let newimagecontainer = document.createElement("div");
      let newimagematch = document.createElement("div");
      let newimage = document.createElement("img");
      let newimagetitle = document.createElement("div");
      if (firstimg) {
        newimagecontainer.className = "newimagebox selected";
        firstimg = false;
      }else{
        newimagecontainer.className = "newimagebox";
      }
      newimageboxborder.appendChild(newimagecontainer);
      newimagecontainer.appendChild(newimagematch);
      newimagematch.innerHTML = e.score + "% match";
      newimagematch.className = "imagematch";
      newimagecontainer.appendChild(newimage);
      newimage.src = e.path;
      newimage.id = "pickerimagecontainer";
      newimagecontainer.appendChild(newimagetitle);
      newimagetitle.innerHTML = e.name.toString().split(',').join(' ');
      newimagetitle.className = "imagetitle";
      
      newimagecontainer.addEventListener("click", function () {
        //unselect all other images
        $(".newimagebox.selected").removeClass("selected");

        this.classList.add("selected");
        //console.log(this.parentElement);
      });
      
      imagecontainer.appendChild(newimageboxborder);
      
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (editboth)
      typetochange="both";
    else if (editportrait)
      typetochange="portrait";
    else
      typetochange="token";

    html.find("#confirmimage").click((ev) => {
      let selectedimg = $(".newimagebox.selected").find("img");
      if (selectedimg.length > 0) {
        let path = selectedimg[0].attributes.src.value;
        let entry = this.entry;
        updatecompimage(path, entry,typetochange);
        this.close();
      }
      //console.log("no image selected");

      return false;
    });

    html.find("#cancelimage").click((ev) => {
      this.close();
      return false;
    });

    html.find("#cancelimage").click((ev) => {
      this.close();
      return false;
    });

    html.find("#cancelall").click((ev) => {
      this.close(false);
      return false;
    });
  }
}

export default class BestiaryImport extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      classes: ["mapperconfig"],
      template: "modules/imagemapper/templates/mapperconfig.html",
      width: "auto",
      height: "auto",
      resizable: false,
      minimizable: true,
      title: "Compendium image mapper",
    });
    return options;
  }

  async _render(force = false, options = {}) {
    // Stuff Before rendering
    //load all settings
    let defaultmapimages = game.settings.get('imagemapper', 'defaultmapimages');
    let defaultonlymapmissing = game.settings.get('imagemapper', 'defaultonlymapmissing');
    let defaultautomapimagematches = game.settings.get('imagemapper', 'defaultautomapimagematches');
    let defaultmapimagepercent = game.settings.get('imagemapper', 'defaultmapimagepercent');
    let defaulttie = game.settings.get('imagemapper', 'defaulttie');
    let defaultmanualmap = game.settings.get('imagemapper', 'defaultmanualmap');
    let defaultmanualmapimagepercent = game.settings.get('imagemapper', 'defaultmanualmapimagepercent');
    let savelastimagepath = game.settings.get('imagemapper', 'savelastimagepath');
    let bucketinputdefault = game.settings.get('imagemapper', 'bucketinputdefault');
    let sourceinputdefault = game.settings.get('imagemapper', 'sourceinputdefault');
    let pathinputdefault = game.settings.get('imagemapper', 'pathinputdefault');

    await super._render(force, options);
    // Stuff After rendering

    //populate the dropdown with all available compendiums
    let compendiums = game.packs.entries;
    let packselector = $("#" + this.id).find("#packselector")[0];
    let count = 0;
    //0.8.x support
    for (const [key, value] of game.packs.entries()) {
      packselector.options[count] = new Option(value.metadata.label);
      count++;
    }
    //
    //compendiums.forEach((element) => {
    //  packselector.options[count] = new Option(element.metadata.label);
    //  count++;
    //});
    selectedComplabel = packselector.options[packselector.selectedIndex].label;

    if (defaultmapimages=="portrait")
      $("#" + this.id).find("#portrait").attr('checked', true);
    else if (defaultmapimages=="token")
      $("#" + this.id).find("#token").attr('checked', true);
    else if (defaultmapimages=="both")
      $("#" + this.id).find("#both").attr('checked', true);

    if (defaultonlymapmissing==true)
      $("#" + this.id).find("#onlyempty").attr('checked', true);
    else
      $("#" + this.id).find("#onlyempty").attr('checked', false);

    if (defaultautomapimagematches==true)
      $("#" + this.id).find("#autoapply").attr('checked', true);
    else
      $("#" + this.id).find("#autoapply").attr('checked', false);

    $("#" + this.id).find("#autonr").text(defaultmapimagepercent);
    $("#" + this.id).find("#autonr").val(defaultmapimagepercent);

    if (defaulttie == "manualtie")
      $("#" + this.id).find("#manualtie").attr('checked', true);
    else if (defaulttie == "randomtie")
      $("#" + this.id).find("#randomtie").attr('checked', true);

    if (defaultmanualmap)
      $("#" + this.id).find("#manualapply").attr('checked', true);
    else
      $("#" + this.id).find("#manualapply").attr('checked', false);

    $("#" + this.id).find("#manualnr").text(defaultmanualmapimagepercent);
    $("#" + this.id).find("#manualnr").val(defaultmanualmapimagepercent);

    $("#" + this.id).find("#bucketinput").text(bucketinputdefault);
    $("#" + this.id).find("#bucketinput").val(bucketinputdefault);

    $("#" + this.id).find("#sourceinput").text(sourceinputdefault);
    $("#" + this.id).find("#sourceinput").val(sourceinputdefault);

    $("#" + this.id).find("#pathinput").text(pathinputdefault);
    $("#" + this.id).find("#pathinput").val(pathinputdefault);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#startmapper").click((ev) => {
      startmapper(html);
      return false;
    });

    html.find("#pathpicker").click((ev) => {
      setpath(html, this.position);
      html.find("#undomap")[0].disabled = false;
      return false;
    });

    html.find("#undomap").click((ev) => {
      resetToBackup();
      return false;
    });

    html.find("#packselector").on("change", (ev) => {
      selectedComplabel = ev.target.options[ev.target.selectedIndex].label;
    });
  }
}


async function updatecompimage(path, entry, typetochange) {
  let packselector = $("#packselector")[0];
  selectedComplabel = packselector.options[packselector.selectedIndex].label;
  selectedComp = game.packs.find((e) => e.metadata.label === selectedComplabel);
  let waslocked = selectedComp.locked;
  if (waslocked){
    selectedComp.configure({locked: false});
  }
  let updates = [];
  if (typetochange == "both") {
    entry.prototypeToken.texture.src = path;
    updates = [{ _id: entry.id, img: path, token: entry.prototypeToken }];
  } else if (typetochange == "portrait") {
    updates = [{ _id: entry.id, img: path }];
  } else {
    entry.prototypeToken.texture.src = path;
    updates = [{ _id: entry.id, token: entry.prototypeToken }];
  }
  const updated = await Actor.updateDocuments(updates, {
    pack: selectedComp.metadata.packageName + "." + selectedComp.metadata.name,
  });
  if (waslocked){
    selectedComp.configure({locked: true});
  }
  console.log("updated image for: " + entry.name);
}
 
function setpath(html, position) {
  const fp = new FilePicker();
  fp.callback = (path) => {
    const newsource = fp.activeSource;
    const newbucket = fp.result.bucket;
    let inputfield = html.find("#pathinput")[0];
    let savelastimagepath = game.settings.get('imagemapper', 'savelastimagepath');
    //because s3 is very particular in file structure, we need to clean the path
    //it's less confusing to the user to do this for all data sources, however this breaks forgevtt
    //so we don't clean it if the source is forgevtt
    if (newsource != 'forgevtt'){
      let regu = RegExp('.*\/\/[^\/]*\/');
      let regu2 = RegExp('\/?[^\.\/]*\.(jpeg|jpg|gif|png|bmp|svg|webp)','i');
      path = path.replace(regu,'');
      path = path.replace(regu2,'');
    }
    if (path == ''){
      inputfield.placeholder = 'Root';
    }
    inputfield.value = path;
    let sourcefield = html.find("#sourceinput")[0];
    sourcefield.value = newsource;

    let bucketfield = html.find("#bucketinput")[0];
    if (newbucket != null){
      if (savelastimagepath)
        game.settings.set('imagemapper', 'bucketinputdefault',newbucket);
      bucketfield.value = newbucket;
    }else{
      if (savelastimagepath)
        game.settings.set('imagemapper', 'bucketinputdefault',"");
      bucketfield.placeholder = 'N/A';
    }

    if (savelastimagepath)
    {
      game.settings.set('imagemapper', 'sourceinputdefault',newsource);
      game.settings.set('imagemapper', 'pathinputdefault',path);
    }
  };
  fp.options.type = "image";
  fp.options.top = position.top + 40;
  fp.options.top = position.left + 10;
  //console.log(fp);
  fp.browse();
}

async function startmapper(html) {
  //gather form data
  editportrait = html.find("#portrait")[0].checked;
  editboth = html.find("#both")[0].checked;
  onlymapempty = html.find("#onlyempty")[0].checked;

  autohit = html.find("#autoapply")[0].checked;
  autohittreshhold = html.find("#autonr")[0].value;
  manualtie = html.find("#manualtie")[0].checked;

  manualhit = html.find("#manualapply")[0].checked;
  hittreshhold = html.find("#manualnr")[0].value;

  pathtomap = html.find("#pathinput")[0].value;
  
  sourcetomap = html.find("#sourceinput")[0].value;

  buckettomap = html.find("#bucketinput")[0].value;

  if (editboth)
    typetochange="both";
  else if (editportrait)
    typetochange="portrait";
  else
    typetochange="token";

  let packselector = html.find("#packselector")[0];
  selectedComplabel = packselector.options[packselector.selectedIndex].label;

  selectedComp = findComp(selectedComplabel);
  //selectedComp = game.packs.entries.find(
  //  (e) => e.metadata.label === selectedComplabel
  //);

  let data = await getasyncdata(pathtomap, sourcetomap);
  let entrylist = data[1];
  backupentries = [];
  backupentries = duplicate(entrylist);
  let imagelist = data[0];
  let cleanimagelist = [];

  for (var x = 0; x < imagelist.length; x++) {
    let cleanimagename = cleanname(imagelist[x]);
    if (cleanimagename.length > 0) {
      cleanimagelist.push({path: imagelist[x], image: cleanimagename });
    }
  }

  //reset manual confirm windows
  manualconfirmwindows = [];

  //get progressbar info
  let percent = $(".mapperconfig .mapprogress div")[1];
  let progressbar = $(".mapperconfig .mapprogress div")[2];
  let progressincrement = 100 / entrylist.length;
  $(progressbar).width("0%");

  //for each entry, find the matching images and their match value
  for (let i = 0; i < entrylist.length; i++) {
    //update progress
    let progressper = (i+1) * progressincrement;
    progressper = Math.round(progressper) * 100;
    progressper = progressper / 100;
    progressper = progressper.toString() + "%";

    $(progressbar).width(progressper);
    percent.innerHTML = progressper;

    const entrymatches = await GetMatchesForEntry(
      cleanimagelist,
      cleanname(entrylist[i].name)
    );

    if (entrymatches.length > 0) {
      await processMatchesForEntry(entrylist[i], entrymatches,typetochange);
    }
    // even though it awaits for the previous function to complete, it goes to fast causing lag
    await timeout(10);
  }
  openpickers(manualconfirmwindows);
}

async function processMatchesForEntry(entry, entrymatches,typetochange) {
  entrymatches = entrymatches.sort(
    (a, b) => parseFloat(b.score) - parseFloat(a.score)
  );

  if (entrymatches[0].score >= autohittreshhold && autohit) {
    if (
      manualtie &&
      entrymatches.length > 1 &&
      entrymatches[0].score == entrymatches[1].score
    ) {
      manualconfirmwindows.push([entrymatches, entry]);
      //console.log(manualconfirmwindows);
    } else {
      updatecompimage(entrymatches[0].path, entry,typetochange);
    }
  } else if (entrymatches[0].score >= hittreshhold && manualhit) {
    manualconfirmwindows.push([entrymatches, entry]);
  }

  //console.log(entry.name);
  //console.log(entrymatches);
}

async function GetMatchesForEntry(collection, entry) {
  const result = [];
  for (let i = 0; i < collection.length; i++) {
    const subArray = collection[i];
    //console.log(subArray.image);
    const score = await matcharrays(subArray.image, entry);

    if (score > 0) {
      result.push({ score, path: subArray.path,name:subArray.image });
    }
  }
  return result;
}

async function openpickers() {
  //console.log("multiple matches with same % match, opening picker");
  if (manualconfirmwindows.length > 0) {
    let manualwindowdata = manualconfirmwindows.pop();
    let hitlist = manualwindowdata[0];
    let newentry = manualwindowdata[1];
    let temp = {
      hits: hitlist,
      entry: newentry,
    };
    let test = new ImageOptions(temp);
    test.workaround(temp);
    //console.log(manualconfirmwindows);
  }
}

async function resetToBackup(){
  let packselector = $("#packselector")[0];
  selectedComplabel = packselector.options[packselector.selectedIndex].label;

  selectedComp = findComp(selectedComplabel);
  ///selectedComp = game.packs.entries.find(
  ///  (e) => e.metadata.label === selectedComplabel
  //);

  //selectedComp.locked = false;
  backupentries.forEach(e => {
    selectedComp.updateEntity(e);
  });
}

async function getasyncdata(path, source) {
  let dataBrowser2 = new FilePicker();
  dataBrowser2.activeSource = source;
  dataBrowser2.options.current = path;
  if (buckettomap != null && buckettomap != ""){
    dataBrowser2.options.bucket = buckettomap;
  }
  dataBrowser2.current = path;

  let multiData = await Promise.all([
    //dataBrowser2.browse(path),

    dataBrowser2.constructor
      .browse(dataBrowser2.activeSource, path, dataBrowser2.options)
      .catch((error) => {
        ui.notifications.warn(error);
        return this.constructor.browse(source, "", options);
      }),

    selectedComp.getIndex(),
  ]);
  multiData[0] = multiData[0].files;

  let regu = RegExp("(.(jpeg|jpg|gif|png|bmp|svg|webp))",'i');
  multiData[0] = multiData[0].filter(function (e) {
    return e.match(regu);
  });
  //console.log(multiData[0]);
  //dataBrowser2.close();

  let imagefiles = multiData[0];
  let packentries = multiData[1];

  if (editboth)
  {
    // console.log("Getting started on tokens and portraits")
    let packentriesdetailed = [];
    for (const [key, value] of packentries.entries()) {
      let testing = await selectedComp.getDocument(key);
      packentriesdetailed.push(testing);
    }
    if (onlymapempty) {
      packentriesdetailed = packentriesdetailed.filter(
        (tempentry) =>
          tempentry.prototypeToken.texture.src == "" ||
          tempentry.prototypeToken.texture.src.includes("icons/svg/mystery-man.svg") ||
          tempentry.prototypeToken.texture.src.includes("icons/mystery-man.png") ||
          tempentry.prototypeToken.texture.src.includes(
            "systems/pf2e/icons/default-icons/npc.svg"
          ) ||
          tempentry.prototypeToken.texture.src.includes("icons/svg/mystery-man.webp") ||
          tempentry.img == "" ||
          tempentry.img.includes("icons/svg/mystery-man.svg") ||
          tempentry.img.includes("icons/mystery-man.png") ||
          tempentry.img.includes(
            "systems/pf2e/icons/default-icons/npc.svg"
          ) ||
          tempentry.img.includes("icons/svg/mystery-man.webp")
      );
    }
    // console.log("finishing both")
    return [imagefiles, packentriesdetailed];   
  }
  if (!editportrait) {
    // console.log("Getting started on tokens only")
    let packentriesdetailed = [];
    for (const [key, value] of packentries.entries()) {
      let testing = await selectedComp.getDocument(key);
      packentriesdetailed.push(testing);
    }
    ///for (var i = 0; i < packentries.length; i++) {
    //  let testing = await selectedComp.getDocument(packentries[i].key);
    //  packentriesdetailed.push(testing);
    //}
    if (onlymapempty) {
      packentriesdetailed = packentriesdetailed.filter(
        (tempentry) =>
          tempentry.prototypeToken.texture.src == "" ||
          tempentry.prototypeToken.texture.src.includes("icons/svg/mystery-man.svg") ||
          tempentry.prototypeToken.texture.src.includes("icons/mystery-man.png") ||
          tempentry.prototypeToken.texture.src.includes("systems/pf2e/icons/default-icons/npc.svg") ||
          tempentry.prototypeToken.texture.src.includes("icons/svg/mystery-man.webp")
      );
    }
    // console.log("finishing tokens only")
    return [imagefiles, packentriesdetailed];
  } 
  let packentriesdetailed = [];
    for (const [key, value] of packentries.entries()) {
      let testing = await selectedComp.getDocument(key);
      packentriesdetailed.push(testing);
    }

  if (onlymapempty) {
    // console.log("Getting started on portraits only")
    packentriesdetailed = packentriesdetailed.filter(
      (tempentry) =>
        tempentry.img == "" ||
        tempentry.img.includes("icons/svg/mystery-man.svg") ||
        tempentry.img.includes("icons/mystery-man.png") ||
        tempentry.img.includes("systems/pf2e/icons/default-icons/npc.svg") ||
        tempentry.img.includes("icons/svg/mystery-man.webp")
    );
  }
  // console.log("finishing portraits only")
  return [imagefiles, packentriesdetailed];
}

function processTokens()
{

}

function urldecode(str) {
  //remove uri added by foundry
  try{
    str = decodeURIComponent((str + "").replace(/\+/g, "%20"));
  }
  catch (error){
    //no uri
  }
  //remove any existing uri from original file name
  return str; //decodeURIComponent((temp + "").replace(/\+/g, "%20"));
}

function cleanname(orgname) {
  //remove path
  let regu = RegExp(".*/");
  let newname = orgname.replace(regu, "");
  //replace dangerous urlcode for backslash
  regu = RegExp("(%5C)",'g');
  newname = newname.replace(regu, " ");
  //decode html chars
  newname = urldecode(newname);
  newname = urldecode(newname);
  //remove file extension
  regu = RegExp("(.(jpeg|jpg|gif|png|bmp|svg|webp))",'i');
  newname = newname.replace(regu, "");
  //remove all non alphabet/spaces--
  regu = RegExp("[^\-a-zA-Z _\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]", "g");
  newname = newname.replace(regu, "");
  //insert space between lowerToCaptial
  regu = RegExp("([a-z])([A-Z])", "g");
  newname = newname.replace(regu, "$1 $2");
  //lowercase it all
  newname = newname.toLowerCase();
  //split on spaces, underscores
  regu = RegExp("_| |・|・|-", "g");
  let splitname = newname.split(regu);
  //remove empty items
  splitname = splitname.filter(function (e) {
    return e != null && e != "";
  });
  //remove duplicates
  splitname = [...new Set(splitname)];
  return splitname;
}

async function matcharrays(imagearray, entryarray) {
  //if either array is empty, simply return no match
  //TODO: validate earlier / remove this check
  if (imagearray.length == 0 || entryarray.length == 0) {
    return 0;
  }
  //method 1, check how many of the smaller array match the longer array
  let base = entryarray;
  let find = imagearray;
  let maxmatches = entryarray.length;
  let matches = 0;
  if (imagearray.length > entryarray.length) {
    base = imagearray;
    find = entryarray;
    maxmatches = imagearray.length;
  }
  find.forEach((str) => {
    if (base.indexOf(str) > -1) {
      matches += 1;
    }
  });

  if (matches == 0) {
    return 0;
  }
  let hit = 100 * (matches / maxmatches);

  //method 2, entry is leading, check how many of the entry's name are in the image name
  maxmatches = entryarray.length;
  matches = 0;
  find = entryarray;
  base = imagearray;
  find.forEach((str) => {
    if (base.indexOf(str) > -1) {
      matches += 1;
    }
  });
  let hit2 = 100 * (matches / maxmatches);

  //combine both methods results and take the average
  return Math.round(hit + hit2) / 2;
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findComp(selectedComplabel){
  for (const [key, value] of game.packs.entries()) {
    if (value.metadata.label === selectedComplabel){
      return value;
    }
  }
  return null;
}

/*
Hooks.once("ready", () => {
  //dev
  let bestimport = new BestiaryImport();
  bestimport.render(true);
});
*/

Hooks.on("renderCompendiumDirectory", addButtonToCompendium);
Hooks.on("renderCompendiumDirectoryPF" , addButtonToCompendium);

function addButtonToCompendium(){
  let html = $("#compendium");
  if (game.user.isGM) {
    const mapperButton = $(
      `<button class="create-compendium"><i class="fas fa-atlas"></i>Compendium Mapper</button>`
    );
    html.find(".directory-footer").append(mapperButton);

    mapperButton.click((ev) => {
      ev.preventDefault();
      let bestimport = new BestiaryImport();
      bestimport.render(true);
    });
  }
}
