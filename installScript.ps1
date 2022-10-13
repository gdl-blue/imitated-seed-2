# define
$file = "js/theseed.js", "js/jquery-2.1.4.min.js", "js/jquery-1.11.3.min.js", "js/intersection-observer.js", "js/dateformatter.js", "css/wiki.css", "css/katex.min.css", "css/diffview.css"

# wget -Uri $source -OutFile $relDir

foreach ($aaa in $file) {
    $source = "https://theseed.io/" + $aaa
    $dest = $PSScriptRoot + "/" + $aaa
    wget -Uri $source -OutFile $dest
}
