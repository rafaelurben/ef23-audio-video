////////////////////////////
// Scripts for audio.html //
////////////////////////////

// Inputs & variables

let context, analyser, source, gainnode
let isplaying = false;
const databuffer = new Float32Array(1024)
const svg_volume_elem = document.querySelector("#svg-volume")

// The smoothing factor is used to make the visible volume go back a little bit slower when the volume suddenly decreases.
const smoothing_factor_slider = document.querySelector("#smoothing_factor_slider")
const smoothing_factor_display = document.querySelector("#smoothing_factor_display")
var smoothing_factor = smoothing_factor_slider.value
smoothing_factor_display.innerHTML = smoothing_factor
smoothing_factor_slider.addEventListener("input", function () {
    smoothing_factor = smoothing_factor_slider.value
    smoothing_factor_display.innerHTML = smoothing_factor
})

// The gain is used to amplify the input volume.
const gain_slider = document.querySelector("#gain_slider")
const gain_display = document.querySelector("#gain_display")
var gain = gain_slider.value
gain_display.innerHTML = gain
gain_slider.addEventListener("input", function () {
    gain = gain_slider.value
    gain_display.innerHTML = gain

    if (gainnode) {
        gainnode.gain.value = gain
    }
})

// Setup

function setUpAudioContext() {
    context = new AudioContext();
    analyser = context.createAnalyser()
    analyser.ftSize = 1024
    gainnode = new GainNode(context, { gain: gain })
    gainnode.connect(analyser)
}

// Utils

function setButtonStates(states) {
    // Input: [[id, state], [id, state], ...]
    states.forEach(state => {
        document.querySelector(`#${state[0]}`).disabled = !state[1];
    })
}

function stopAudio() {
    isplaying = false;
    source.disconnect();

    setButtonStates([["startMicButton", true], ["stopMicButton", false], ["startFileButton", true], ["stopFileButton", false]])

    clearFrame();
}

// Button actions

async function startMic() {
    setUpAudioContext()

    setButtonStates([["startMicButton", false], ["stopMicButton", true], ["startFileButton", false], ["stopFileButton", false]])

    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    source = context.createMediaStreamSource(micStream);
    source.connect(gainnode)

    isplaying = true;
    updateFrame()
}

function stopMic() {
    stopAudio();
}

function startFile() {
    setUpAudioContext()

    setButtonStates([["startMicButton", false], ["stopMicButton", false], ["startFileButton", false], ["stopFileButton", true]])

    const myAudio = document.querySelector('audio');
    myAudio.play()
    source = context.createMediaElementSource(myAudio);
    source.connect(gainnode)
    gainnode.connect(context.destination) // Replace gainnode with source to not apply gain to "real" output
    myAudio.currentTime = 37;

    isplaying = true;
    updateFrame()
}

function stopFile() {
    stopAudio();

    const myAudio = document.querySelector('audio');
    myAudio.pause();
    myAudio.currentTime = 0;
}

// Visualization

// The value from the latest function call. (used for smoothing)
let latest_value = 0;

function showData(data) {
    svg_volume_elem.innerHTML = "";

    let sum = 0;
    data.forEach(d => sum += d);
    latest_value = Math.max(sum, latest_value * smoothing_factor)

    for (let i = 0; i < Math.min(latest_value * 8, 90); i++) {
        let mode = "circle";
        let color = `hsl(${Math.max(130 - (i * 3), 0)},100%,35%)`;
        if (mode === "circle") {
            let circle = document.createElement("circle");
            circle.setAttribute("fill", color)
            circle.setAttribute("r", 5)
            circle.setAttribute("cx", 11 * (i) + 5)
            circle.setAttribute("cy", 5)
            svg_volume_elem.appendChild(circle);
        }
    }

    // Without this line, JS doesn't rerender the SVG. I don't know why neither understand why this line changes anything.
    svg_volume_elem.innerHTML += "";

    // Debug
    // outputelem.innerHTML += `<p><br>${data.join("<br>")}<br><br>${Math.max(...data)}<br>${sum}<p>`;
}

function updateFrame() {
    if (isplaying) {
        analyser.getFloatTimeDomainData(databuffer)
        data = databuffer.slice(0, 10);

        showData(data);

        // Let JS know that we want to run this function when the next frame is rendered
        requestAnimationFrame(updateFrame);
    }
}

function clearFrame() {
    svg_volume_elem.innerHTML = "";
    latest_value = 0;
}


window.onload = function () {
    setButtonStates([["startMicButton", true], ["stopMicButton", false], ["startFileButton", true], ["stopFileButton", false]])
}