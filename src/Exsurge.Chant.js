//
// Author(s):
// Fr. Matthew Spencer, OSJ <mspencer@osjusa.org>
//
// Copyright (c) 2008-2016 Fr. Matthew Spencer, OSJ
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

import * as Exsurge from 'Exsurge.Core'
import { Step, Pitch, Rect, Point, Margins } from 'Exsurge.Core'
import { ctxt, QuickSvg, ChantLayoutElement, ChantNotationElement, GlyphCode, GlyphVisualizer, Lyric, Annotation, DropCap } from 'Exsurge.Drawing'
import { Glyphs } from 'Exsurge.Glyphs'
import { Custod, AccidentalType } from 'Exsurge.Chant.Signs'
import { Gabc } from 'Exsurge.Gabc'


export var LiquescentType = {
  None: 0,

  // flags that can be combined, though of course it
  // it doesn't make sense to combine some!
  Large: 1 << 0,
  Small: 1 << 1,
  Ascending: 1 << 2,
  Descending: 1 << 3,
  InitioDebilis: 1 << 4,

  // handy liquescent types
  LargeAscending: 1 << 0 | 1 << 2,
  LargeDescending: 1 << 0 | 1 << 3,
  SmallAscending: 1 << 1 | 1 << 2,
  SmallDescending: 1 << 1 | 1 << 3
};

export var NoteShape = {
  // shapes
  Default:    0,
  Virga:      1,
  Inclinatum: 2,
  Quilisma:   3,
  Stropha:    4,
  Oriscus:    5
};

export var NoteShapeModifiers = {

  // flags which modify the shape
  // not all of them apply to every shape of course
  None:       0,
  Ascending:  1 << 0,
  Descending: 1 << 1,
  Cavum:      1 << 2,
  Stemmed:    1 << 3
};

/**
 * @class
 */
export class Note extends ChantLayoutElement {

  /**
   * @para {Pitch} pitch
   */
  constructor(pitch) {
    super();

    if (typeof pitch !== 'undefined')
      this.pitch = pitch;
    else
      this.pitch = null;

    this.glyphVisualizer = null;

    // The staffPosition on a note is an integer that indicates the vertical position on the staff.
    // 0 is the center space on the staff (equivalent to gabc 'g'). Positive numbers go up
    // the staff, and negative numbers go down, i.e., 1 is gabc 'h', 2 is gabc 'i', -1 is gabc 'f', etc.
    this.staffPosition = 0;
    this.liquescent = LiquescentType.None;
    this.shape = NoteShape.Default;
    this.shapeModifiers = NoteShapeModifiers.None;
    this.markings = [];
  }

  setGlyph(ctxt, glyphCode) {
    if (this.glyphVisualizer)
      this.glyphVisualizer.setGlyph(ctxt, glyphCode);
    else
      this.glyphVisualizer = new GlyphVisualizer(ctxt, glyphCode);

    this.glyphVisualizer.setStaffPosition(ctxt, this.staffPosition);

    // assign glyphvisualizer metrics to this note
    this.bounds.x = this.glyphVisualizer.bounds.x;
    this.bounds.y = this.glyphVisualizer.bounds.y;
    this.bounds.width = this.glyphVisualizer.bounds.width;
    this.bounds.height = this.glyphVisualizer.bounds.height;

    this.origin.x = this.glyphVisualizer.origin.x;
    this.origin.y = this.glyphVisualizer.origin.y;
  }

  // a utility function for modifiers
  shapeModifierMatches(shapeModifier) {
    if (shapeModifier === NoteShapeModifiers.None)
      return this.shapeModifier === NoteShapeModifiers.None;
    else
      return this.shapeModifier & shapeModifier !== 0;
  }

  draw(ctxt) {

    this.glyphVisualizer.bounds.x = this.bounds.x;
    this.glyphVisualizer.bounds.y = this.bounds.y;

    this.glyphVisualizer.draw(ctxt);
  }

  createDrawable(ctxt) {

    this.glyphVisualizer.bounds.x = this.bounds.x;
    this.glyphVisualizer.bounds.y = this.bounds.y;
    return this.glyphVisualizer.createDrawable(ctxt);
  }
}

export class Clef extends ChantNotationElement {

  constructor(staffPosition, octave, defaultAccidental = null) {
    super();

    this.isClef = true;
    this.staffPosition = staffPosition;
    this.octave = octave;
    this.defaultAccidental = defaultAccidental;
    this.activeAccidental = defaultAccidental;
  }

  resetAccidentals() {
    this.activeAccidental = this.defaultAccidental;
  }

  pitchToStaffPosition(pitch) {

  }

  performLayout(ctxt) {
    ctxt.activeClef = this;

    if (this.defaultAccidental)
      this.defaultAccidental.performLayout(ctxt);

    super.performLayout(ctxt);
  }

  finishLayout(ctxt) {

    // if we have a default accidental, then add a glyph for it now
    if (this.defaultAccidental) {
      var accidentalGlyph = this.defaultAccidental.createGlyphVisualizer(ctxt);
      accidentalGlyph.bounds.x += this.visualizers[0].bounds.right() + ctxt.intraNeumeSpacing;
      this.addVisualizer(accidentalGlyph);
    }

    super.finishLayout(ctxt);
  }
}

export class DoClef extends Clef {

  constructor(staffPosition, octave, defaultAccidental = null) {
    super(staffPosition, octave, defaultAccidental);

    this.leadingSpace = 0.0;
  }

  pitchToStaffPosition(pitch) {
    return (pitch.octave - this.octave) * 7 + this.staffPosition +
            Pitch.stepToStaffOffset(pitch.step) -
            Pitch.stepToStaffOffset(Step.Do);
  }

  staffPositionToPitch(staffPosition) {
    var offset = staffPosition - this.staffPosition;
    var octaveOffset = Math.floor(offset / 7);

    var step = Pitch.staffOffsetToStep(offset);

    if (this.defaultAccidental !== null && step === this.defaultAccidental.step)
      step += this.defaultAccidental.accidentalType;

    return new Pitch(step, this.octave + octaveOffset);
  }

  performLayout(ctxt) {
    super.performLayout(ctxt);

    var glyph = new GlyphVisualizer(ctxt, GlyphCode.DoClef);
    glyph.setStaffPosition(ctxt, this.staffPosition);
    this.addVisualizer(glyph);

    this.finishLayout(ctxt);
  }

  clone() {
    return new DoClef(this.staffPosition, this.octave, this.defaultAccidental);
  }
}


export class FaClef extends Clef {

  constructor(staffPosition, octave, defaultAccidental = null) {
    super(staffPosition, octave, defaultAccidental);

    this.octave = octave;

    this.leadingSpace = 0;
  }

  pitchToStaffPosition(pitch) {
    return (pitch.octave - this.octave) * 7 + this.staffPosition +
            Pitch.stepToStaffOffset(pitch.step) -
            Pitch.stepToStaffOffset(Step.Fa);
  }

  staffPositionToPitch(staffPosition) {
    var offset = staffPosition - this.staffPosition + 3; // + 3 because it's a fa clef (3 == offset from Do)
    var octaveOffset = Math.floor(offset / 7);

    var step = Pitch.staffOffsetToStep(offset);

    if (step === Step.Ti && this.defaultAccidental === AccidentalType.Flat)
      step = Step.Te;

    return new Pitch(step, this.octave + octaveOffset);
  }

  performLayout(ctxt) {
    super.performLayout(ctxt);

    var glyph = new GlyphVisualizer(ctxt, GlyphCode.FaClef);
    glyph.setStaffPosition(ctxt, this.staffPosition);
    this.addVisualizer(glyph);

    this.finishLayout(ctxt);
  }

  clone() {
    return new FaClef(this.staffPosition, this.octave, this.defaultAccidental);
  }
}

export class ChantLineBreak extends ChantNotationElement {

  constructor(justify) {
    super();

    this.justify = justify;
  }

  performLayout(ctxt) {

    // reset the bounds before doing a layout
    this.bounds = new Rect(0, 0, 0, 0);
  }

  clone() {
    var lb = new ChantLineBreak();
    lb.justify = this.justify;

    return lb;
  }
}


// a chant line represents one staff line on the page. ChantLines are created by the score
// and laid out by the page
export class ChantLine extends ChantLayoutElement {

  constructor(score) {
    super();

    this.score = score;

    this.scoreNotationStart = 0;
    this.scoreNotationCount = 0;
    this.notations = [];
    this.notationBounds = null; // Rect

    this.staffLeft = 0;
    this.staffRight = 0;

    this.custod = null;

    this.justify = true;

    this.ledgerLines = [];

    this.startingClef = null; // necessary for the layout process

    this.nextLine = null;
    this.previousLine = null; // for layout assistance

    // fixme: make these configurable values from the score
    this.spaceAfterNotations = 30; // the space between the notation bounds and the first text track
    this.spaceBetweenTextTracks = 20; // spacing between each text track
  }

  setStartingClef(clef) {
    this.startingClef = clef.clone();
  }

  performLayout(ctxt) {

    // start off with a rectangle that holds at least the four staff lines
    // we fudge the 3 to 3.1 so that the svg doesn't crop off the upper/lower staff lines...
    this.notationBounds = new Rect(this.staffLeft, -3.1 * ctxt.staffInterval,
      this.staffRight - this.staffLeft, 6.2 * ctxt.staffInterval);

    // run through all the elements of the line and calculate the bounds of the notations,
    // as well as the bounds of each text track we will use
    var i;
    var notation = null;

    for (i = 0; i < this.notations.length; i++)
      this.notationBounds.union(this.notations[i].bounds);

    var baseLyricVerticalOffset = this.notationBounds.y + this.notationBounds.height + ctxt.lyricTextSize;

    var numLyricLines = 0;

    // finalize the lyrics placement
    for (i = 0; i < this.notations.length; i++) {
      notation = this.notations[i];

      numLyricLines = Math.max(numLyricLines, notation.lyrics.length);

      for (var j = 0; j < notation.lyrics.length; j++)
        notation.lyrics[j].bounds.y = baseLyricVerticalOffset + ctxt.lyricTextSize * j;
    }

    // dropCap and the annotations
    if (this.scoreNotationStart === 0) {

      if (this.score.dropCap !== null) {

        // drop caps and annotations are drawn from their center, so aligning them
        // horizontally is as easy as this.staffLeft / 2
        this.score.dropCap.bounds.x = this.staffLeft / 2;
        this.score.dropCap.bounds.y = baseLyricVerticalOffset;
      }

      if (this.score.annotation !== null) {
        // annotations use dominant-baseline to align text to the top
        this.score.annotation.bounds.x += this.staffLeft / 2;
        this.score.annotation.bounds.y +=  - ctxt.staffInterval * 3;
      }
    }

    this.notationBounds.height += ctxt.lyricTextSize;

    this.bounds.x = 0;
    this.bounds.y = this.notationBounds.y;
    this.bounds.width = this.notationBounds.right();
    this.bounds.height = this.notationBounds.height + ctxt.lyricTextSize * numLyricLines;

    // the origin of the chant line's coordinate space is at the center line of the left extremity of the staff
    this.origin = new Point(this.staffLeft, -this.notationBounds.y);
  }

  createDrawable(ctxt) {
    var inner = "";

    // add the chant lines
    var i, x1 = this.staffLeft, x2 = this.staffRight;

    // create the staff lines
    for (i = -3; i <= 3; i += 2) {

      inner += QuickSvg.createFragment('line', {
        'x1': x1,
        'y1': ctxt.staffInterval * i,
        'x2': x2,
        'y2': ctxt.staffInterval * i,
        'stroke': ctxt.staffLineColor,
        'stroke-width': ctxt.staffLineWeight,
        'class': 'staffLine'
      });
    }

    // create the ledger lines
    for (i = 0; i < this.ledgerLines.length; i++) {

      var ledgerLine = this.ledgerLines[i];
      var y = ctxt.calculateHeightFromStaffPosition(ledgerLine.staffPosition);

      inner += QuickSvg.createFragment('line', {
        'x1': ledgerLine.x1,
        'y1': y,
        'x2': ledgerLine.x2,
        'y2': y,
        'stroke': ctxt.staffLineColor,
        'stroke-width': ctxt.staffLineWeight,
        'class': 'ledgerLine'
      });
    }

    // dropCap and the annotations
    if (this.scoreNotationStart === 0) {

      if (this.score.dropCap !== null)
        inner += this.score.dropCap.createDrawable(ctxt);

      if (this.score.annotation !== null)
          inner += this.score.annotation.createDrawable(ctxt);
    }

    // add all of the notations
    for (i = 0; i < this.notations.length; i++)
      inner += this.notations[i].createDrawable(ctxt);

    return QuickSvg.createFragment('g', {
      'class': 'chantLine',
      'transform': 'translate(' + this.bounds.x + ',' + this.bounds.y + ')'
    }, inner);
  }


  buildFromChantNotationIndex(ctxt, newElementStart, width) {

    // todo: reset / clear the children we have in case they have data
    this.scoreNotationStart = newElementStart;
    this.scoreNotationCount = 0;
    this.notations = [];

    this.staffLeft = 0;

    if (width > 0)
      this.staffRight = this.staffLeft + width;
    else
      this.staffRight = 99999999; // no limit to staff size

    // If this is the first chant line, then we have to make room for a
    // drop cap and/or annotation, if present
    if (this.scoreNotationStart === 0) {

      var padding = 0;

      if (this.score.dropCap !== null)
        padding = this.score.dropCap.bounds.width + this.score.dropCap.padding * 2;

      if (this.score.annotation !== null)
        padding = Math.max(padding, this.score.annotation.bounds.width + this.score.annotation.padding * 4);

      this.staffLeft += padding;
    }

    // set up the clef...
    // Also, add the clef as a child (which will also set the clef in the context)
    this.setStartingClef(ctxt.activeClef);
    this.startingClef.performLayout(ctxt);
    this.startingClef.bounds.x = this.staffLeft;
    this.notations.push(this.startingClef);

    var curr = this.startingClef, prev = null, prevWithLyrics = null;

    // todo: estimate how much space we have available to us
    var rightBoundary = this.staffRight - Glyphs.CustodLong.bounds.width - ctxt.intraNeumeSpacing * 4; // possible custod on the line

    // todo: iterate through the notations, fittng what we can on this line
    var i, scoreNotations = this.score.notations;

    for (i = newElementStart; i < scoreNotations.length; i++) {

      if (curr.hasLyrics())
        prevWithLyrics = curr;

      prev = curr;
      curr = scoreNotations[i];

      // try to fit the curr element on this line.
      // if it doesn't fit, we finish up here.
      var fitsOnLine = this.positionNotationElement(ctxt, prevWithLyrics, prev, curr, rightBoundary);
      if (fitsOnLine === false) {

        // check if the prev elements want to be kept with this one
        for (var k = i - 1; k > this.scoreNotationStart; k--) {
          var cne = this.score.notations[k];

          if (cne.keepWithNext === true) {
            this.notations.pop(); // remove it from our notations
            this.scoreNotationCount--;
          } else
            break;
        }

        // we are at the end of the line!
        break;
      }

      curr.chantLine = this;
      this.notations.push(curr);
      this.scoreNotationCount++;

      // line breaks are a special case indicating to stop processing here
      if (curr.constructor.name === ChantLineBreak.name && width > 0) {
        this.justify = curr.justify;
        break;
      }
    }

    var last, extraSpace = 0;

    if (this.notations.length > 0) {
      last = this.notations[this.notations.length - 1];

      if (last.hasLyrics() && last.getLyricRight(0) > (last.bounds.right() + last.trailingSpace))
        extraSpace = this.staffRight - last.getLyricRight(0);
      else
        extraSpace = this.staffRight - (last.bounds.right() + last.trailingSpace);
    }

    // create the custod at the end of the line (if we need it!)
    // if we find an element following this one that is a neume, we create a custod for it
    for (i = this.scoreNotationStart + this.scoreNotationCount; i < this.score.notations.length; i++) {
      var notation = this.score.notations[i];

      if ('notes' in notation && notation.notes.length > 0) {

        var custod = new Custod();
        custod.referringNeume = notation;

        custod.performLayout(ctxt);

        if (this.notations.length > 0) {
          last = this.notations[this.notations.length - 1];
          custod.bounds.x = last.bounds.x + last.bounds.width;
        }

        this.custod = custod;
        this.notations.push(custod);

        extraSpace -= custod.bounds.width + custod.leadingSpace;

        // nothing more to see here...
        break;
      }
    }

    if (width <= 0 && this.notations.length > 0) {
      // set the staff width based on the notations.
      this.staffRight = this.notations[this.notations.length - 1].bounds.right();
    }

    // Justify the line if we are not the last one
    if (this.justify === true && width > 0 &&
        this.scoreNotationStart + this.scoreNotationCount < this.score.notations.length &&
        extraSpace > 0)
      this.justifyElements(extraSpace);

    this.finishLayout(ctxt);
  }

  justifyElements(extraSpace) {

    var indices = [];

    var i, prev = null, curr = null, prevWithLyrics = null;

    // if we have a custod, place it at the end of the line
    if (this.custod !== null) 
      this.custod.bounds.x = this.staffRight - this.custod.bounds.width - this.custod.leadingSpace;

    // first pass: determine the neumes we can space apart
    // start at 1 to skip the clef
    for (i = 1; i < this.notations.length - 1; i++) {

      if (curr !== null && curr.hasLyrics())
        prevWithLyrics = curr;

      prev = curr;
      curr = this.notations[i];

      if (prev !== null && prev.keepWithNext === true)
        continue;

      if (prevWithLyrics !== null && prevWithLyrics.lyrics[0].allowsConnector() && !prevWithLyrics.lyrics[0].needsConnector)
        continue;

      if (curr.constructor.name === ChantLineBreak.name)
        continue;

      // otherwise, we can add space before this element
      indices.push(i);
    }

    if (indices.length === 0)
      return;

    var offset = 0;
    var increment = extraSpace / indices.length;
    var lastIndex = (this.notations[this.notations.length - 1].constructor.name === 'Custod') ? this.notations.length - 1 : this.notations.length;
    for (i = 1; i < lastIndex; i++) {

      curr = this.notations[i];

      if (indices.indexOf(i) >= 0) {
        curr.bounds.x += offset + increment;
        offset += increment;
      } else
        curr.bounds.x += offset;
    }

    offset = offset;
  }

  finishLayout(ctxt) {

    this.ledgerLines = []; // clear any existing ledger lines

    var epismata = []; // keep track of epismata in case we can connect some

    // make a final pass over all of the notes to add any necessary
    // ledger lines and to smooth out epismata
    for (var i = 0; i < this.notations.length; i++) {

      // if it's not a neume, then skip over it, right?
      if (typeof this.notations[i].notes === 'undefined')
        continue;

      var neume = this.notations[i];

      for (var j = 0; j < neume.notes.length; j++) {
        var note = neume.notes[j];

        // do we need a ledger line for this note?
        var staffPosition = note.staffPosition;

        if (staffPosition >= 5 || staffPosition <= -5) {

          var x1 = neume.bounds.x + note.bounds.x - ctxt.staffInterval;
          var x2 = neume.bounds.x + note.bounds.x + note.bounds.width + ctxt.staffInterval;

          // round the staffPosition to the nearest line
          if (staffPosition > 0)
            staffPosition = staffPosition - (staffPosition - 1) % 2;
          else
            staffPosition = staffPosition - (staffPosition + 1) % 2;

          // if we have a ledger line close by, then average out the distance between the two
          var minLedgerSeperation = ctxt.staffInterval * 5;

          if (this.ledgerLines.length > 0 &&
              this.ledgerLines[this.ledgerLines.length - 1].x2 + minLedgerSeperation >= x1) {

            // average out the distance
            var half = (x1 - this.ledgerLines[this.ledgerLines.length - 1].x2) / 2;
            this.ledgerLines[this.ledgerLines.length - 1].x2 += half;
            x1 -= half;
          }

          // finally, add the ledger line
          this.ledgerLines.push({
            x1: x1,
            x2: x2,
            staffPosition: staffPosition
          });
        }

        var noteHasEpisema = false;

        // blend epismata as we're able
        for (var k = 0; k < note.markings.length; k++) {

          if (note.markings[k].constructor.name !== "HorizontalEpisema")
            continue;

          noteHasEpisema = true;
          var episema = note.markings[k];

          // we try to blend the episema if we're able.
          if (epismata.length === 0 ||
              epismata[0].episema.positionHint !== episema.positionHint ||
              epismata[0].episema.terminating === true) {

            // start a new set of epismata to potentially blend
            epismata = [];
            epismata.push({
              episema: episema,
              neume: neume
            });
          } else {
            // blend all previous with this one
            var newY;

            if (episema.positionHint === Exsurge.MarkingPositionHint.Below)
              newY = Math.max(episema.bounds.y, epismata[0].episema.bounds.y);
            else
              newY = Math.min(episema.bounds.y, epismata[0].episema.bounds.y);

            if (episema.bounds.y !== newY)
              episema.updateY(newY);
            else {
              for (var l = 0; l < epismata.length; l++)
                epismata[l].episema.updateY(newY);
            }

            // extend the last episema to meet the new one
            var newWidth = (neume.bounds.x + episema.bounds.x) - (epismata[epismata.length - 1].neume.bounds.x + epismata[epismata.length - 1].episema.bounds.x);
            epismata[epismata.length - 1].episema.updateWidth(newWidth);

            epismata.push({
              episema: episema,
              neume: neume
            });
          }
        }

        // if the note doesn't have any episema, then make sure and stop blending epismata
        if (noteHasEpisema === false)
          epismata = [];
      }
    }
  }


  // this is where the real core of positioning neumes takes place
  // returns true if positioning was able to fit the neume before rightBoundary.
  // returns false if cannot fit before given right margin.
  // fixme: if this returns false, shouldn't we set the connectors on prev to be activated?!
  positionNotationElement(ctxt, prevWithLyrics, prev, curr, rightBoundary) {

    var i;

    // To begin we just place the current notation right after the previous,
    // irrespective of lyrics.
    curr.bounds.x = prev.bounds.right() + prev.trailingSpace;

    // if the previous notation has no lyrics, then we simply make sure the
    // current notation with lyrics is in the bounds of the line
    if (prevWithLyrics === null) {

      var maxRight = curr.bounds.right() + curr.trailingSpace;

      // if the lyric left is negative, then offset the neume appropriately
      for (i = 0; i < curr.lyrics.length; i++) {

        curr.lyrics[i].setNeedsConnector(false); // we hope for the best!

        if (curr.getLyricLeft(i) < 0)
          curr.bounds.x += -curr.getLyricLeft(i);

        maxRight = Math.max(maxRight, curr.getLyricRight(i));
      }

      if (maxRight > rightBoundary)
        return false;
      else
        return true;
    }

    // if the curr notation has no lyrics, then we force the prev notation
    // with lyrics to have syllable connectors.
    if (curr.hasLyrics() === false) {

      for (i = 0; i < prevWithLyrics.lyrics.length; i++) {

        if (prevWithLyrics.lyrics[i] !== null && prevWithLyrics.lyrics[i].allowsConnector())
          prevWithLyrics.lyrics[i].setNeedsConnector(true);
      }

      if (curr.bounds.right() + curr.trailingSpace < rightBoundary)
        return true;
      else
        return false;
    }

    // if we have multiple lyrics on the current or the previous notation,
    // then we simplify the process. We don't try to eliminate syllable
    // connectors but we require them on every syllable in the previous
    // notation that permits a connector.
    //
    // A nice (but probably tricky) enhancement would be to combine lyrics
    // when possible, taking into consideration hyphenation of each syllable!
    var lyricCount = Math.max(prevWithLyrics.lyrics.length, curr.lyrics.length);

    if (lyricCount > 1) {

      var prevLyricRightMax = Number.MIN_VALUE;
      var currLyricLeftMin = Number.MAX_VALUE;

      for (i = 0; i < lyricCount; i++) {
          
        if (i < prevWithLyrics.lyrics.length && prevWithLyrics.lyrics[i] !== null) {

          var right = prevWithLyrics.getLyricRight(i);

          if (prevWithLyrics.lyrics[i].allowsConnector()) {
            prevWithLyrics.lyrics[i].setNeedsConnector(true);
            right += prevWithLyrics.lyrics[i].widthWithConnector - prevWithLyrics.lyrics[i].widthWithoutConnector;
          } else
            right += ctxt.minLyricWordSpacing;

          prevLyricRightMax = Math.max(prevLyricRightMax, right);
        }

        if (i < curr.lyrics.length && curr.lyrics[i] !== null)
          currLyricLeftMin = Math.min(currLyricLeftMin, curr.getLyricLeft(i));
      }
      
      // if the lyrics overlap, then we need to shift over the current element a bit
      if (prevLyricRightMax > currLyricLeftMin)
        curr.bounds.x += prevLyricRightMax - currLyricLeftMin;

      if (curr.bounds.right() < rightBoundary)
        return true;
      else {
        curr.bounds.x = 0 ; //StartingClef.Right;
        return false;
      }
    }
    
    // handling single lyric lines is a little more nuanced, since we carefully
    // eliminate syllable connectors when we're able...
    curr.lyrics[0].setNeedsConnector(false); // we hope for the best!

    var currLyricLeft = curr.getLyricLeft(0);
    var prevLyricRight = prevWithLyrics.getLyricRight(0);

    if (prevWithLyrics.lyrics[0].allowsConnector() === false) {

      // No connector needed, but include space between words if necessary!
      if (prevLyricRight + ctxt.minLyricWordSpacing > currLyricLeft) {
        // push the current element over a bit.
        curr.bounds.x += prevLyricRight + ctxt.minLyricWordSpacing - currLyricLeft;
      }

    } else {

      // we may need a connector yet...

      if (prevLyricRight > currLyricLeft) {
        // in this case, the lyric elements actually overlap.
        // so nope, no connector needed. instead, we just place the lyrics together
        // fixme: for better text layout, we could actually use the kerning values
        // between the prev and curr lyric elements!
        curr.bounds.x += prevLyricRight - currLyricLeft;

      } else {

        // bummer, looks like we couldn't merge the syllables together. Better add a connector...
        prevWithLyrics.lyrics[0].setNeedsConnector(true);
        prevLyricRight = prevWithLyrics.getLyricRight(0);

        if (prevLyricRight > currLyricLeft)
          curr.bounds.x += prevLyricRight - currLyricLeft;
      }
    }

    if (curr.bounds.right() + curr.trailingSpace < rightBoundary)
      return true;

    // if we made it this far, then the element won't fit on this line.
    // set the position of the current element to the beginning of a chant line,
    // and mark the previous lyric as connecting if needed.
    // curr.bounds.x = this.startingClef.bounds.right();

    if (prevWithLyrics.hasLyrics() && prevWithLyrics.lyrics[0].allowsConnector())
      prevWithLyrics.lyrics[0].setNeedsConnector(true);

    return false;
  }
}

/*
 * Score, document
 */
export class ChantScore {

  constructor() {

    this.startingClef = null; // Clef

    this.notations = [];
    this.lines = [];
    this.notes = [];

    this.dropCap = null;
    this.annotation = null;

    this.compiled = false;

    this.autoColoring = true;

    // valid after chant lines are created...
    this.bounds = new Rect();
  }

  changeClefCallback(ctxt_, clef) {
    if (this.startingClef === null)
      this.startingClef = clef;

    ctxt_.activeClef = clef;
  }

  performLayout(ctxt, finishedCallback) {

    // first order of business: let the clef perform layout
    this.startingClef.performLayout(ctxt);

    if (this.dropCap)
      this.dropCap.recalculateMetrics(ctxt);

    if (this.annotation)
      this.annotation.recalculateMetrics(ctxt);

    if (this.compiled) {
      setTimeout(() => {
        if (finishedCallback)
          finishedCallback();
      }, 0);
    } else {
      // boot the compilation process
      setTimeout(() => {
        this.compileElement(ctxt, 0, finishedCallback);
      }, 0);
    }
  }

  compileElement(ctxt, index, finishedCallback) {

    if (index >= this.notations.length) {

      if (!this.compiled) {
        this.compiled = true;
        setTimeout(() => {
          if (finishedCallback)
            finishedCallback();
        }, 0);
      }

      return;
    }

    var timeout = new Date().getTime() + 50; // process for fifty milliseconds
    do {
      var notation = this.notations[index++];
      if(!notation.compiled) {
        notation.performLayout(ctxt);
        notation.compiled = true;
      }
    } while (index < this.notations.length && new Date().getTime() < timeout);

    // schedule the next block of processing
    setTimeout(() => {
      this.compileElement(ctxt, index, finishedCallback);
    }, 0);
  }

  layoutChantLines(ctxt, width, finishedCallback) {

    this.lines = [];

    var y = 0;
    var currIndex = 0;

    ctxt.activeClef = this.startingClef;

    do {

      var line = new ChantLine(this);

      line.buildFromChantNotationIndex(ctxt, currIndex, width);
      currIndex += line.scoreNotationCount;
      line.performLayout(ctxt);
      this.lines.push(line);

      line.bounds.y = -line.bounds.y + y;
      y += line.bounds.height + ctxt.staffInterval * 3;

    } while (currIndex < this.notations.length);

    var lastLine = this.lines[this.lines.length - 1];

    this.bounds.x = 0;
    this.bounds.y = 0;
    this.bounds.width = lastLine.bounds.width;
    this.bounds.height = y;

    if (finishedCallback)
      finishedCallback(this);
  }

  createDrawable(ctxt) {

    var i, drawable = "";

    // create defs section
    for (var def in ctxt.defs)
      if (ctxt.defs.hasOwnProperty(def))
        drawable += ctxt.defs[def];

    drawable = QuickSvg.createFragment('defs', {}, drawable);

    for (i = 0; i < this.lines.length; i++)
      drawable += this.lines[i].createDrawable(ctxt);

    drawable = QuickSvg.createFragment('g', {}, drawable);

    drawable = QuickSvg.createFragment('svg', {
      'xmlns': 'http://www.w3.org/2000/svg',
      'version': '1.1',
      'xmlns:xlink': 'http://www.w3.org/1999/xlink',
      'class': 'ChantScore',
      'width': this.bounds.width,
      'height': this.bounds.height
    }, drawable);

    return drawable;
  }

  unserializeFromJson(data) {
    this.autoColoring = data['auto-coloring'];

    if (data.annotation !== null && data.annotation !== "") {
      // create the annotation
      this.annotation = new Annotation(ctxt, data.annotation);
    } else
      this.annotation = null;

    var createDropCap = data['drop-cap'] === 'auto' ? true : false;

    Gabc.parseChantNotations(data.notations, this, createDropCap);
  }

  serializeToJson() {
    var data = {};

    data['type'] = "score";
    data['auto-coloring'] = true;

    if (this.annotation !== null)
      data.annotation = this.annotation.unsanitizedText;
    else
      data.annotation = "";

    

    return data;
  }
}

export class ChantDocument {
  constructor() {

    var defaults = {
      layout: {
        units: "mm",
        'default-font': {
          'font-family': "Crimson",
          'font-size': 14
        },
        page: {
          width: 8.5,
          height: 11,
          'margin-left': 0,
          'margin-top': 0,
          'margin-right': 0,
          'margin-bottom': 0
        }
      },
      scores: []
    };

    // default layout
    this.copyLayout(this, defaults);

    this.scores = defaults.scores;
  }

  copyLayout(to, from) {

    to.layout = {
      units: from.layout.units,
      'default-font': {
        'font-family': from.layout['default-font']['font-family'],
        'font-size': from.layout['default-font']['font-size']
      },
      page: {
        width: from.layout.page.width,
        height: from.layout.page.height,
        'margin-left': from.layout.page['margin-left'],
        'margin-top': from.layout.page['margin-top'],
        'margin-right': from.layout.page['margin-right'],
        'margin-bottom': from.layout.page['margin-bottom']
      }
    };
  }

  unserializeFromJson(data) {

    this.copyLayout(this, data);

    this.scores = [];

    // read in the scores
    for (var i = 0; i < data.scores.length; i++) {
      var score = new ChantScore();

      score.unserializeFromJson(data.scores[i]);
      this.scores.push(score);
    }
  }

  serializeToJson() {
    var data = {};

    this.copyLayout(data, this);

    data.scores = [];

    // save scores...
    for (var i = 0; i < this.scores.length; i++)
      data.scores.push(this.scores[i].serializeToJson());

    return data;
  }
}
