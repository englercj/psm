# Panther Server Manager (v0.0.1)

## Overview

Panther Server Manager is a [Node.js](http://nodejs.org) application designed to manage [Minecraft](http://minecraft.com) game servers. This 
module includes the PSM Daemon (psmd) that manages (potentially) multiple minecraft server instances. The PSM service also provides a RESTful API 
for controlling all your minecraft servers. Each psmd instance has the ability to manage other *remote* psmd instances. 
In this way you can have a central management server managing its own (optional) local servers, as well as multiple remote managers that each
manage their own local servers; for a fully distributed Minecraft management solution.

This module also provides a CLI application (psm) that wraps around the API for easy use from the command line.

## Features

 - Distributed management via multiple managers
 - CLI Interface
 - RESTful API

## Dependencies

 - Node.js (0.6.x)
 - Npm (1.x.x)
 - MongoDB

## Installation

The easiest way to install the module is with `npm`:

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

### Example `config.yml`
```yaml
api:
  enabled: yes
  host: 127.0.0.1 #host for api to bind to, 0.0.0.0 will bind to all ipv4
  port: 9876
  #cookie session secret (easily generated with `apg -m 64 -n 1`)
  cookieSecret: "FiOmpedirjirjOywykmigiptyanVaiHemCab#ShrennestAbKoicZytothlishIr"
logging:
  file:
    level: silly
    encoder: json
    filename: "/home/psm/devpsm/logs/psm.log"
    maxsize: 52428800
    rotate: 10
  cli:
    level: silly
    encoder: text
sockets:
  worker: "/tmp/psmd-worker-$#.sock"
pids:
  manager: "/home/psm/pids/psmd.pid"
  worker: "/home/psm/pids/psmd-worker-$#.pid"
debug: false
```
