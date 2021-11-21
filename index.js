const escpos = require('escpos');
const Jimp = require('jimp')

escpos.USB = require('escpos-usb');
const device = new escpos.USB();

const printer = new escpos.Printer(device, {
    encoding: "GB18030",
    width: 32
});

function printText(text) {
    device.open((error) => {
        if (error) {
            console.log(error);
            return
        }
        printer.text(text)
        printer.feed(2)
        printer.close();
    })
}

function printImage(filePath) {
    device.open((error) => {
        if (error) {
            console.log(error);
            return
        }
        console.log(`print image ${filePath}`)
        escpos.Image.load(filePath, async result => {
            await printer.image(result, "D24")
            printer.feed(2)
            printer.close();
        })
    })
}

function FloydSteinbergDithering(errorMultiplier, data, w, h) {

    var filter = [
        [0, 0, 0, 7 / 48, 5 / 48],
        [3 / 48, 5 / 48, 7 / 48, 5 / 48, 3 / 48],
        [1 / 48, 3 / 48, 5 / 48, 3 / 48, 1 / 48]
    ];

    var error = [];
    var x, y, xx, yy, r, g, b;

    for (y = 0; y < h; y++)error.push(new Float32Array(w));

    for (y = 0; y < h; y++) {

        for (x = 0; x < w; x++) {
            var id = ((y * w) + x) * 4;

            r = data[id];
            g = data[id + 1];
            b = data[id + 2];

            var avg = (r + g + b) / 3;
            avg -= error[y][x] * errorMultiplier;

            var e = 0;
            if (avg < 128) {
                e = -avg;
                avg = 0;
            }
            else {
                e = 255 - avg;
                avg = 255;
            }

            data[id] = data[id + 1] = data[id + 2] = avg;
            data[id + 3] = 255;

            for (yy = 0; yy < 3; yy++) {
                for (xx = -2; xx <= 2; xx++) {
                    if (y + yy < 0 || h <= y + yy
                        || x + xx < 0 || w <= x + xx) continue;

                    error[y + yy][x + xx] += e * filter[yy][xx + 2];
                }
            }
        }
    }
    return data;
}

async function parse(src) {
    const out = "./out.png"

    const image = await Jimp.read(src)
    image.cover(384, 384, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
    // image.blur(1)

    var ditheredData = FloydSteinbergDithering(1, image.bitmap.data, image.bitmap.width, image.bitmap.height);
    const ditheredImage = new Jimp({
        data: ditheredData,
        width: image.bitmap.width,
        height: image.bitmap.height
    })

    await ditheredImage.write(out)
}

const JPEG = require('jpeg-js');


Jimp.decoders['image/jpeg'] = (data) => JPEG.decode(data, { 
	maxResolutionInMP: 600, maxMemoryUsageInMB: 1024 });

parse('./sample.png').then(() => {
    printImage("./out.png")
    console.log("done")
})