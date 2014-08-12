## autonavx_web - interactive exercises for AUTONAVx course

This repository contains the code for the interactive exercises used in the [AUTONAVx](https://www.edx.org/course/tumx/tumx-autonavx-autonomous-navigation-1658) course on edX.

### Build

Make sure you have npm (included in [nodejs](http://nodejs.org/)) and [bower](http://bower.io/) installed. 

Run the following commands in the autonavx_web folder:

```shell
npm install
bower install
grunt shell:make_skulpt
grunt
```

Open http://localhost:8000/ to view a list of all exercise files.
