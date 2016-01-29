# joomlascan

[![NPM info](https://nodei.co/npm/joomlascan.png?downloads=true)](https://nodei.co/npm/joomlascan.png?downloads=true)

CLI utility to find Joomla installs and get the installed version.

There are many ways you might want to find Joomla installations, so rather than build in a variety of search methods,
this utility takes a list of candidate paths from `stdin` and identifies the correct folders by looking for
`version.php` in known locations. For example, an easy way to find Joomla is using `locate`:

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
$ find /var/www -name configuration.php -depth 3 | joomlascan
```

### Sample output:

```
┌────────────────────────┬─────────────────┬────────┬────────────────┐
│ Path to Joomla install │ Install version │ Status │ Latest version │
├────────────────────────┼─────────────────┼────────┼────────────────┤
│ /var/www/example.org   │ 3.3.6           │ Eol    │ 3.4.8          │
├────────────────────────┼─────────────────┼────────┼────────────────┤
│ /var/www/example.com   │ 3.3.6           │ Eol    │ 3.4.8          │
└────────────────────────┴─────────────────┴────────┴────────────────┘
```

Results are sorted in ascending order of the install version.


## TODO

- No tests!
- Offer plain text output option for automation
- Better version handling and show more information about releases
- Pull in and display security advisories?
- Smarter handling of timeouts and lack of connectivity to updates.joomla.org
