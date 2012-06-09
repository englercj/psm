## v0.0.1

Overview
========

Panther Server Manager is a [Node.js](http://nodejs.org) application designed to manage [Minecraft](http://minecraft.com) game servers. This 
module includes the PSM Daemon (psmd) that managers multiple worker processes each individually managing a minecraft server instance via
the Minecraft RTK ***need RTK link*** plugin. The PSM service provides a RESTful API for controlling all your minecraft servers. This
RESTful API also provides a way for psmd instances to manager other *remote* psmd instances. In this way you can have a central management server
managing its own local workers, as well as multiple remote managers that each manage their own local workers; for a fully distributed
Minecraft management solution.

This module also provides a CLI application (psm) that wraps around the API for easy use from the command line.

Features
========

 - Isolated management via multiple workers
 - Distributed management via multiple managers
 - CLI Interface
 - RESTful API
 - Fully configurable via API, or CLI

Dependencies
============

 - Node.js (0.6.x)
 - Npm (1.x.x)
 - MongoDB

Installation
============

The easiest way to install the module is with `npm`:

    npm install psm -g

You can manually clone the repo and install with this script (still requires npm):

    git clone git://github.com/pantherdev/psm.git &&
    cd psm &&
    npm install -g

Configuration
=============

The `database.json` file in the `config/` directory holds the connection information for you MongoDB connection.
The application will store its configuration and other settings in the MongoDB for persistent use. Please edit
the `database.json` file before attempting to start the psmd service.

#### Example `database.json`

    {
	"mongodb": {
	    "host": "localhost",
	    "port": 27017,
	    "database": "psm"
	}
    }
