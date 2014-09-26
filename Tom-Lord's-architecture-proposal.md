# Metapolator architectural proposal

by Tom Lord (@dasht)

This document contains an architectural proposal for
Metapolator: A suggested form for the overall structure of the
program and a suggested path for building it.

On 2014-08-21 the document was discussed by Lasse, Tom and Dave ([youtube](http://youtu.be/8LjJnvNlMc4))

Reuben Thomas (@sc3d) wrote a suggestion based on this document, the above discussion, and Lasse's [[CPS interpolation alternative]]: [[Architectural improvements via interpolation]]

# An important note about the user interface and font commands

The architectural specification contained in this document is
all but _silent_ on the question of how the user interface
part of the program should be structured.

The architecture within _does_ describe an asynchronous
protocol by means of which one or more user interfaces may
communicate with the core application.  It _does not_ describe
how the UI, on the "other side" of that protocol, is written.

The UI, in other words, is architecturally decoupled from what
is described here.

Examples of things _not_ covered by this architecture:

* The pen model(s).

* The exact semantics of metapolation.

* How interactive widgets wind up on the screen.

* etc.

Instead, this architecture aims to create a framework in 
which those things can be worked on very directly and easily
by the people with domain expertise in those areas.

More hacking font magic, is the goal, and less fretting over
"plumbing".




# A top-down overview

From the highest bird's eye perspective:

Metapolator is divided into four parts, shown here with
some ASCII-art:

```
 UI  <-->  Property Table Editor <-->  Interfaces to Storage
                      ^
                      |
                      V
        (abstract) Interactive Commands
```

## UI

The UI is of course responsible for the appearance of the
display and for interpreting user input.

## Property Table Editor

The property table editor allows users to create and edit
lists of named properties.  Each list of properties is
assigned to an integer encoding value (typically a Unicode
codepoint).

For example, codepoint 41 (Unicode 'A') might have a property
named "skeleton", bound to a list of of skeleton strokes, and
a property "height" bound to a number.

Note: Fontforge has a concept of "unencoded" glyphs.  In the
property table editor view of the world, unencoded glyphs
should be provisionally assigned an encoding in a Unicode
"Private Use Area".

The table editor allows property values to be defined by
applying defaults to many codepoints at once.  A default
"height" might be set for all characters with descenders, for
example.

The table editor allows multiple tables to be edited at once
and even allows for virtual "synthetic" tables, such as a
table derived by metapolation.

Like a spreadsheet, the table editor automatically updates
computed property values as the table is modified.  Users can
quickly see the effect of changing a property value.


## (abstract) Interactive Commands

Interactive commands are ordinary Javascript functions that
implement user-centric editting operations for modifying
tables.

Interactive commands are "abstract" because they are not
concerned with how the user interacts with the UI.

An example can make this clearer:

Consider the operation of moving a control point on the
skeleton of a font.  Such an operation might be invoked by
dragging a handle, or by clicking on "up" and "down" buttons,
or by pressing arrow keys or typing numbers into a data entry
box.

Regardless of how the command is invoked, the underlying edit
operation is the same: adjust the position of the control
point by changing the value bound to some property.

An Interctive Command is a javascript function that implements
that underlying edit operation: the operation of moving the
point without regard to how the user invoked this action.

It is the separate business of the UI to provide an interface
for invoking the operation.

Interactive commands are given names so that they can be
referenced from the UI.  They are given documentation strings
so that user interfaces can be "self documenting".

Extension packages can add new interactive commands to the set
available.


## Interfaces to storage

Interfaces to storage are simply interactive commands
privileged to access storage on behalf of users.

This separation into regular interactive commands, and
commands which interface storage, allows extension packages to
be divided into extensions requiring more trust (storage
commands) and those that are mostly harmless (other commands).


## Separations of knowledge

This architecture treats the Table Editor as a _generic
component_ with _no specific font-making functionality_.

The table editor "knows" about named properties and knows
about assigning them to encoding values, but the table editor
"knows" nothing at all about font making.

The UI, of course, must embody much domain knowledge about
font making.   What to the table editor is simply a generic
property has a richer meaning to the UI (e.g. "pen-width").

Similarly, a "built-in" core of the Interactive Commands is
also generic, emboding no particular knowledge about font
making.  The rest of the Interactive Commands, defined by
extension packages, will embody considerable font making
knowledge.

The primary intent of this separation of knowledge is to keep
the table editor small and simple, and make it possible to
stabilize its functionality earlier rather than later.

The table editor's functionality needs to be stable if, over
time, the quantity of extension packages and the complexity of
the UI grow.    It would be a problem if the table editor
frequently changed in ways that required extensive revisions
to font-making edit commands or the UI.


## Major differences from existing code

Existing code (and discussion of code) is centered on an
architectural analogy to the DOM structure and CSS as used in
web browsers: the MOM / CPS model.

The MOM defines a somewhat recombinant hierarchy of
metapolator font-making entities such as masters and glyphs.

CPS is a mechanism for assigning lists of properties
("parameters") to nodes in that hierarchy and provides
CSS-style setting of defaults and over-rides.

Conceptually, the CPS and MOM together provide the combined
functionality of the Table Editor, Interactive Commands, and
Interfaces to Storage.  In the CPS and MOM version, these
share state directly with the UI, communicating in an ad hoc
event-driven way.

By way of comparison:

The table editor avoids the code complexity and performance
issues raised by extending and evaluating CSS-style selectors.
There are no "nodes" with "class" and "name" attributes; no
question of whether one selector is "more specific" than any
other.

In place of CSS mechanics, the table editor allows default
properties to be set by a list of rules.  Each rule names a
_set_ of encoding numbers to which the rule applies, along
with property bindings for the table entries named in that
set.  Rules near the top of the list ("project" scope) are the
overridden by rules farther down the list ("master" scope and
"glyph" scope).

Also, whereas the MOM is directly a model of fonts, the table
editor is a more generic structure: just encoding points with
property values.  The font knowledge embedded in the UI,
interactive commands, and interfaces to storage must be
expressed via a reduction in terms to this generic structure.

In the proposed architecture commands and the UI still deal in
font abstractions but those abstractions must be implemented
outside of the core editor.  This gives the core editor a
chance to stabilize early while UI and command extension
packages are free to experiment with new, high level
font-editing abstractions.

This is similar to the way Emacs is organized.   The core
editor is nothing but a plain text editor.  Extensions then
build up abstractions to make it act like an outline editor,
directory editor, or whatever.



# Building in Stages

This architecture is meant to be implemented in stages.

At each stage, a "production quality" milestone can be hit
although in the early stages, the functional capabilities will
be very limited.

Each step in this list of stages is meant to go pretty quickly
with just one or two programming challenges to solve:

## Stage 1: glyph-editor

At this stage the table editor will support editing only a
single table.  It will _not_ have a system for setting default
properties at the project or master level.

As a font editor, the "glyph-editor" stage will not be useful
for much more than a very basic form of glyph-at-a-time
editing.

This stage is a chance to get the foundation right and to
create an interactive environment in which to begin to
experiment with and refine the pen model in a live editor.


### Stage 1.25: glyph-editor with undo / redo


### Stage 1.5: multi-buffer glyph editor

This stage will not yet have metapolation but progress towards
that canb e seen by allowing multiple tables (fonts) to be
edited at once.


## Stage 2: "cascading" default properties

Next is added the ability to define default property values at
project and master scope, allowing modifications to be made to
many glyphs at once by adjusting single properties.


### Stage 2.5: synthetic tables / metapolation

At this stage metapolation will be present including
live-updating of the display of derived fonts as their parent
masters (and own properties) are modified.


## Stage 3: the mature metapolator

Finishing touches on the basics while stabilizing and
documenting the interface for extension packages.

After this, if it all goes well, making the font editing
capabilities fancier will be done by writing extension
packages of new commands alongside any needed extensions to
the UI.  A little bit like Emacs.


# Milestone 1: a glyph-editor

The core of the basic glyph editor contains only a few types
and functions.  (Most of the hard work is in the UI and the
earliest interactive command extensions!)

The interface to the core is in a "functional style" rather 
than an elaborate Object Oriented style.

All interface specifications are only approximate, meant to
convey the essential idea.  The details may change as the
code is written.


## Data Types

A few lisp-inspired types are used throughout the interfaces
and implementation.

### Atoms

Atoms are simple (i.e., not composite) immutable values.

#### Numbers, Strings, null, and Booleans

Ordinary Javascript values.

#### Identifiers

Identifiers are used, among other things, as the names of
properties.

	Identifier ("foo")

always returns the same ("===") identifier value.  

	identifierName (id)

returns a string form of an identifier's name.

### Immutable Composite Values

In addition to atoms, there are some immutable composite values:

#### Immutable Tuples

Immutable tuples are array-like objects that are never
modified.  

	Tuple (elt0, elt1, elt2, ...)

creates a new tuple.

All of the elements of tuples must themselves be immutable
(numbers, strings, null, booleans, identifiers, and
earlier-constructed tuples).


### Notation

In this document, as a convenience, tuples will be written
using "<" and ">" as brackets.  For example, the value
returned by:

	Tuple (1, 2, 3)

could be written:

	<1, 2, 3>

Identifiers will be written like program identifiers:

	Identifier ("foo")

returns

	foo


### Pseudo-types 

These are not distinct types.  They are just 
ways of using the immutable types defined above.

#### Property Lists

Property lists are not a distinct type but built from
tuples:

	<  <height, 1.0>
	   <width,  0.9>
	   <doc,    "Compress normally wide glyphs">
	>

with functions like:

	getprop (plist, key) => value

	setprop (plist, key, value) => plist'

This is a pure, functional version of the same idea from 
traditional LISP systems.



#### Glyph Sets

A glyph set ("glyphset") is represented as a tuple containing
individual members and ranges of members.

Thus, this glyphset contains ASCII uppercase vowels:

	< 65, 69, 73, 79, 85 >

This glyphset contains all ASCII letters and digits, plus "-":

	< 45, <48, 57>, <65, 90>, <97, 122> >


Set operations are provided by functions like:

	glyphset_union (a, b) => a union b

Of course, in the user interface and in exchange formats it 
may be desirable to write glyph-sets using character-oriented
notation (e.g. "[AEIOU]").


### Mutable Composite Types

Not all types used are immutable!

#### Codepoint Array

A codepoint array is a sparse array, indexed by encoding
values (Unicode codepoints).

The default value of elements of a codepoint array is nil.

The implementation of a codepoint array should assume a mostly
empty ("nil filled") array, containing a few densely packed
regions with non-nil values.

An efficient way must be provided to iterate over all
_non-nil_ entries in a codepoint array.

It should be obvious that, in the "milestone 1 glyph editor", 
a codepoint array is a suitable representation for 
for a property table.   Non-nil entries in the array contain
property lists.


## Interactive Commands

Interactive commands are ordinary javascript functions that
follow some calling conventions and that are associated with
some meta-data.   

There are two kinds of interactive commands: "simple commands"
that do all of their work in a single call; and "modal
commands" that can stretch their work out over several calls.


### Simple commands

Simple command execute quickly and return.

#### Simple command calling convention

NOTE: the calling conventions for commands will change
slightly at later milestones, but backward compatibility can
be maintained.

Simple interactive commands take named arguments in the form
of a property list.  In some situations they return named
return values in property lists.

Property values must be immutable values (numbers, strings,
null, booleans, identifiers, and tuples).

     simple_cmd_fn (plist)

The return value may have any of these forms and meanings:

	false
	  	The command has failed for an unspecified reason.

	true
		The command has completed successfully.

	< false, "reason" >
		The command has failed.  The string contains an
		error message.

	< true, PLIST >
		The command has succeeded.  The property list
              returned contains named return values.

	PLIST
		Equivaluent to:		< true, PLIST >

      abort
		The command has failed and any changes that
		occurred while it was running should be undone.

      < abort, "reason" >
		Similar to < false, "reason" > but changes are
		undone.


#### Creating a new simple command

A new simple command can be created by specifying a name,
the function that implements the command, and documentation.
Note that this interface is versioned for "milestone 1":

This function may only be used by interactive commands and
extension packages.  It must not be used from the UI.


	m1_decl_simple_fn (name, fn, doc, params, returns)

	  name
		An Identifier that is a name for the command.

	  fn
		The function implementing the command.

	  doc
		A documentation string for the simple function.

              By convention, it should begin with a single
		line summary, not exceeding 64 characters.

		Additional lines of similar length may elaborate.

              
	  params
		nil or a plist whose values are strings.

		In the latter case, the plist names parameters
              accepted by the command and documents each.

	  returns
		nil or a plist documenting return values.

#### Accessing a simple command

These functions may only be used by interactive commands and
extension packages.  They must not be used from the UI.

  m1_command (name)
		Returns nil or the function implementing the named
		simple command.

  m1_doc (name)
		Returns nil or the string documenting the named
		simple command.

  m1_params (name)
		Returns nil or the plist documenting parameters
		to the named simple command.

  m1_returns (name)
		Returns nil or the plist documenting named return
		values from the the indicated simple command.


### Modal commands

Some interactive commands take place in several steps,
spread out over (real) time.   As an example, consider the
UI gesture of grabbing a control point and moving it around.
Eventually the point is released at its destination or some
gesture is made to indicate that the change should be
aborted.

Conceptually and pragmatically an extended gesture like that
is a single, modal command.

The table editor models abstract modal commands as a series
of function calls, rather than (like a simple command) a
single function call.


#### Modal command calling convention

When invoked, a modal command takes a second parameter, called
the "context":

     modal_cmd_fn (context, params_plist)

The return value may have any of these forms and meanings:



	false
	  	The command has failed for an unspecified reason.

	true
		The command has completed successfully.

	< false, "reason" >
		The command has failed.  The string contains an
		error message.

	< true, PLIST >
		The command has succeeded.  The property list
              returned contains named return values.

	PLIST
		Equivaluent to:		< true, PLIST >

      abort
		The command has failed and any changes that
		occurred while it was running should be undone.

      < abort, "reason" >
		Similar to < false, "reason" > but changes are
		undone.

      continue
		The command has succeeded and now the editor is
              in a mode associated with this function.

      <continue, PLIST>
      	The command has succeeded and established a 
              mode.  PLIST specifies return values.

      <continue, PLIST, CONTEXT_PLIST>
      	The command has succeeded and established a 
              mode.  PLIST specifies return values.
              CONTEXT_PLIST specifies a new context.


#### Repeated modal calls

When a modal command is invoked, the "context" parameter (a
property list) contains a value for the property "state".

The "state" of a modal command may be:

	start:
		The editor is not currently in the mode
              associated with the command.  The command
              should initiate this mode.

	done:
		The UI has requested to terminate this mode
              successfully.

	continue:
		The mode is already established and the UI
              is passing changes to parameter values.


The context plist is preserved across calls while a mode
is active.


### Recursive command invocation

The table editor provides a primitive command set to examine and set the properties of entries in the table.

Complex commands can be built out of simpler commands.

# Conclusion

In summary, this riffs on the _simple_ 1980s-style architecture
of Emacs and proposes that all the font magic should be 
conceived of as two things:

1. Extension package commands atop
a very simple-minded property-table editor.
2. A font-centric
UI coupled very lightly to that table editor.

In the above account leading to milestone 1 the account given of
commands is incomplete, the protocol between editor and UI is missing.
I will fill these in over the next several days but I needed to 
put up a good starting point for discussion.