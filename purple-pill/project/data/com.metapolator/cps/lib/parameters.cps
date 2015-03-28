point>center, contour > p{
    _scale: (Scaling widthFactor heightFactor);
    scale: _scale;
    _translate: (Translation sidebearingLeft yTranslate);
    translate: _translate;
    transform:  translate * scale;
}

glyph {
    advanceWidth: base:advanceWidth * widthFactor + sidebearingLeft + sidebearingRight;
    advanceHeight: base:advanceHeight * heightFactor;
}

point > center {
    on: transform * skeleton:on;
    in: transform * skeleton:in;
    out: transform * skeleton:out;
}

contour > p {
    on: transform * skeleton:on;
}

glyph, point > center, contour > p  {
    sidebearingLeft: -10;
    sidebearingRight: -10;
    widthFactor: 1.1;
    heightFactor: 0.98;
}

point > left, point > right, contour > p {
    weightFactor: 1.4;
}