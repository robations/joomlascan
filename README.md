# joomlascan

CLI utility to find Joomla installs and get the installed version.

There are many ways you might want to find Joomla installs so this utility takes a list of candidate paths
from `stdin` and identifies the correct folders by looking for `version.php` in known locations. For example, an easy 
way to find Joomla is using `locate`:

```
$ locate configuration.php
/var/www/html/example.com/configuration.php
/var/www/html/example.com/administrator/components/com_rsform/controllers/configuration.php
/var/www/html/example.com/administrator/administrator/components/com_rsform/models/configuration.php
...
```

## Installation

```
npm i -g joomlascan
```


## Usage

```
$ locate configuration.php | joomlascan
$ joomlascan < mylistofjoomladirectories.txt
```

### Sample output:

```
┌────────────────────────┬─────────────────┐
│ Path to Joomla install │ Current version │
├────────────────────────┼─────────────────┤
│ /var/www/example.org   │ 3.3.6           │
├────────────────────────┼─────────────────┤
│ /var/www/example.com   │ 3.3.0           │
└────────────────────────┴─────────────────┘
```

## TODO

- No tests!
- Offer plain text output option for automation
- Pull in current version numbers for Joomla and flag installs that require to be updated
- Pull in and display security advisories?
