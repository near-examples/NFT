# The `emoji` package

[![CTAN](https://img.shields.io/ctan/v/emoji.svg)](https://www.ctan.org/pkg/emoji)
[![GitHub release](https://img.shields.io/github/release/stone-zeng/latex-emoji/all.svg)](https://github.com/stone-zeng/latex-emoji/releases/latest)

Emoji support in (Lua)LaTeX.

## Introduction

The `emoji` package allows user to typeset emoji in a LaTeX document. It requires LuaHBTeX engine,
which can be called by `lualatex` since TeX Live 2020 or `lualatex-dev` in TeX Live 2019.

## Usage

```tex
\documentclass{article}
\usepackage{emoji}
\setemojifont{Apple Color Emoji}  % Optional

\begin{document}
\emoji{joy}
\emoji{+1}
\emoji{family-man-woman-girl-boy}
\emoji{woman-and-man-holding-hands-light-skin-tone-medium-dark-skin-tone}
\end{document}
```

Result:

> &#x1F602; &#x1F44D; &#x1F468;&#x200D;&#x1F469;&#x200D;&#x1F467;&#x200D;&#x1F466; &#x1F469;&#x1F3FB;&#x200D;&#x1F91D;&#x200D;&#x1F468;&#x1F3FE;

## License

This work may be distributed and/or modified under the conditions of the [LaTeX Project Public License](http://www.latex-project.org/lppl.txt), either version 1.3c of this license or (at your option) any later version.

-----

Copyright (C) 2020, 2021 by Xiangdong Zeng.
