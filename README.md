# Ethive Server

## Packages

### Models

#### _id vs id
_ids are permanent, immutable, globally unique MongoDB ObjectIds. ids are User or Staff generated Strings, designed to be used as human-readable, URL compatible identifiers. 

For now, we try not to expose _id's outside of the application. We haven't done a proper security analysis on whether or not there are risks involved with exposing these. Feel free to take it up.