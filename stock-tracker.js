const colors = [
    "#e52b50", "#008000", "#0000ff", "#ff00ff"
]

const byID = function(id) { return document.getElementById(id); };

function createGraph(canvasID, labels, unit, labelDivID, intervalSize, maxVal, minVal = 0,
    vlines = false, timestamps = false, scalesteps = 5, vlinesFreq = 1) {
    const valueIDs = []
    for (let i = 0; i < labels.length; i++) {
        valueIDs[i] = canvasID + labels[i].replace(" ", "") + "value";
    }

    const graph = new Graph(canvasID, labels.length, valueIDs, unit, intervalSize, maxVal, minVal,
        vlines, timestamps, scalesteps, vlinesFreq);

    for (let i = 0; i < labels.length; i++) {
        const colorID = valueIDs[i] + "color";

        byID(labelDivID).innerHTML += `
            <div style="display: inline-block;">
                <svg width="10" height="10">
                    <rect id="${colorID}" width="10" height="10"/>
                </svg> 
                <span>${labels[i]}:</span>
                <span id="${valueIDs[i]}"></span>
            <div>
        `

        const labelcolor = graph.colors[i];
        byID(colorID).style = "fill:" + labelcolor;
    }

    return graph;
}

class Graph {
    constructor(canvasID, noLabels, valueIDs, unit, intervalSize, maxVal, minVal, vlines, timestamps, scalesteps, vlinesFreq) {
        this.canvas = byID(canvasID);
        const ctx = this.canvas.getContext("2d");
        this.ctx = ctx;

        this.setWidthHeight()

        this.cssScale = window.devicePixelRatio;
        this.scalesteps = scalesteps
        this.noLabels = noLabels;
        this.intervalSize = intervalSize * this.cssScale;
        this.nValuesFloat = this.width / this.intervalSize
        this.nValues = Math.round(this.nValuesFloat) + 1;
        this.points = emptyArray(noLabels, this.nValues);
        this.timestamps_array = emptyArray(1, this.nValues, "");
        this.colors = colorArray(noLabels);
        this.maxVal = maxVal;
        this.valueIDs = valueIDs;
        this.unit = unit;
        this.vlines = vlines;
        this.timestamps = timestamps;
        this.vlinesFreq = vlinesFreq;
        this.minVal = minVal
    }

    setWidthHeight() {
        this.cssScale = window.devicePixelRatio;

        this.canvas.width = this.canvas.clientWidth * this.cssScale;
        this.canvas.height = this.canvas.clientHeight * this.cssScale;
        this.width = this.ctx.canvas.width;
        this.height = this.ctx.canvas.height;
    }

    update(values) {
        for (let i = 0; i < this.noLabels; i++) {
            if (values[i] > this.maxVal) {
                this.maxVal = values[i];
            }

            if (values[i] < this.minVal) {
                this.minVal = values[i];
            }

            this.points = shiftArrayRowLeft(this.points, i, this.nValues, values[i]);
            byID(this.valueIDs[i]).innerHTML = values[i].toFixed(2) + ' ' + this.unit;
        }

        const d = new Date();
        const timestamp_str = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
        this.timestamps_array = shiftArrayRowLeft(this.timestamps_array, 0, this.nValues, timestamp_str);

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.setWidthHeight()

        this.intervalSize = this.width / this.nValuesFloat;

        this.ctx.lineWidth = 2 * this.cssScale;

        if (this.vlines) {
            for (let i = this.nValues - 1; i >= 0; i -= this.vlinesFreq) {
                const x = (i + 1) * this.intervalSize;

                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.height);
                this.ctx.strokeStyle = "#e3e3e3";
                this.ctx.stroke();
            }
        }

        const hstep = this.height / this.scalesteps;
        const sstep = (this.maxVal - this.minVal) / this.scalesteps;

        const canvas_font = Math.min(0.5 * hstep, 15 * this.cssScale)
        this.ctx.font = canvas_font + "px monospace";


        for (let i = 1; i <= this.scalesteps; i++) {
            const y = this.height - i * hstep
            const xoffset = 2;
            const yoffset = canvas_font + 2 * this.cssScale;
            this.ctx.fillText(((i * sstep) + this.minVal).toFixed(2), xoffset, y + yoffset);
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.strokeStyle = "#e3e3e3";
            this.ctx.stroke();
        }

        if (this.timestamps) {
            const xBoundPix = this.ctx.measureText((this.scalesteps * sstep).toFixed(2)).width;
            const xBound = Math.floor((xBoundPix / this.intervalSize) + 1)
            for (let i = this.nValues - 1; i >= xBound; i -= this.vlinesFreq) {
                const x = (i + 1) * this.intervalSize;


                const xoffset = canvas_font + 2 * this.cssScale;
                const yoffset = this.ctx.measureText(this.timestamps_array[0][i]).width + 4 * this.cssScale;
                this.ctx.rotate(Math.PI / 2);
                this.ctx.fillText(this.timestamps_array[0][i], this.height - yoffset, -x + xoffset);
                this.ctx.stroke();
                this.ctx.rotate(-Math.PI / 2);
            }
        }

        for (let i = 0; i < this.noLabels; i++) {
            for (let j = this.nValues - 1; j > 0; j--) {
                const xstart = j * this.intervalSize;
                const xend = (j - 1) * this.intervalSize;
                const ystart = scaleInvert(this.points[i][j], this.minVal, this.maxVal, this.height);
                const yend = scaleInvert(this.points[i][j - 1], this.minVal, this.maxVal, this.height);

                this.ctx.beginPath();
                this.ctx.moveTo(xstart, ystart);
                this.ctx.lineTo(xend, yend);
                this.ctx.strokeStyle = this.colors[i];
                this.ctx.stroke();
            }
        }

    }

}

function scaleInvert(value, minVal, maxVal, height) {
    return (1 - (value - minVal) / (maxVal - minVal)) * height;
}

function shiftArrayRowLeft(array, row, ncols, newVal) {
    for (let i = 0; i < ncols - 1; i++) {
        array[row][i] = array[row][i + 1];
    }

    array[row][ncols - 1] = newVal;

    return array;
}

function emptyArray(nrows, ncols, fill = 0) {
    const arr = [];
    for (let i = 0; i < nrows; i++) {
        arr[i] = [];
        for (let j = 0; j < ncols; j++) {
            arr[i][j] = fill;
        }
    }
    return arr;
}

function colorArray(len) {
    const colorArray = [];
    for (let i = 0; i < len; i++) {
        colorArray[i] = colors[i % colors.length];
    }
    return colorArray;
}