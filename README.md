# Panther Server Manager (v0.0.1)

## Overview

Panther Server Manager is a [Node.js](http://nodejs.org) application designed to manage [Minecraft](http://minecraft.com) game servers. This 
module includes the PSM Daemon (psmd) that can manage multiple minecraft server instances. The PSM service also provides a RESTful API 
for controlling all the minecraft servers.

This module also provides a CLI application (psm) that wraps around the API for easy use from the command line.

## Features

 - Centralized management for all your Minecraft servers
 - CLI Interface
 - RESTful API

## Dependencies

 - Node.js (0.6.x)
 - Npm (1.x.x)
 - MongoDB

## Installation

The easiest way to install the module is with `npm` (Coming Soon):

```bash
npm install psm -g
```

You can manually clone the repo and install with this script (still requires npm):

```bash
git clone git://github.com/pantherdev/psm.git &&
cd psm &&
npm install -g
```

## Configuration

The `database.yml` file in the `config/` directory holds the connection information for you MongoDB connection.
The application will store its managed servers, remotes, and other settings in MongoDB. Please edit
the `database.yml` file before attempting to start the psmd service.

### Example `database.yml`

```yaml
mongodb:
  #this is mongodb://<username>:<password>@<host>:<port>/<database
  uri: "mongodb://psm:psm123@localhost:27017/psm"
```