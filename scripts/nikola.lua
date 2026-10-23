-- Pandoc-фільтр для перенесення rst-сторінок Nikola у Markdown.
-- Знімає обгортки Bootstrap, збирає підписи до зображень і галереї.

local function has(el, cls)
  for _, c in ipairs(el.classes) do
    if c == cls or c == '.' .. cls then return true end
  end
  return false
end

local function starts(el, prefix)
  for _, c in ipairs(el.classes) do
    if c:gsub('^%.', ''):sub(1, #prefix) == prefix then return true end
  end
  return false
end

local function first_image(blocks)
  local found
  pandoc.walk_block(pandoc.Div(blocks), { Image = function(i) found = found or i end })
  return found
end

-- зображення з підписом: ![alt](src "підпис") — підпис стане <figcaption> під час збирання
local function captioned(img, caption)
  img.title = pandoc.utils.stringify(caption)
  if img.caption and pandoc.utils.stringify(img.caption) == 'image' then img.caption = {} end
  return pandoc.Para({ img })
end

function Image(img)
  if pandoc.utils.stringify(img.caption) == 'image' then img.caption = {} end
  img.attr = pandoc.Attr()
  return img
end

-- відступи в rst Nikola — це вкладені контейнери, а не цитати
function BlockQuote(q) return q.content end

function Figure(fig)
  local img = first_image(fig.content)
  if not img then return fig.content end
  return captioned(img, fig.caption.long)
end

function Div(div)
  if has(div, 'teaser-picture') then
    local img = first_image(div.content)
    return pandoc.RawBlock('markdown', '<!-- teaser: ' .. (img and img.src or '') .. ' -->')
  end
  if starts(div, 'gallery-block') then
    return pandoc.Div(div.content, pandoc.Attr('', { 'gallery-item' }))
  end
  if has(div, 'rubric') then
    return pandoc.Para({ pandoc.Strong(pandoc.utils.blocks_to_inlines(div.content)) })
  end
  if has(div, 'text-center') then return div end
  return div.content
end

-- Підписи «.. class:: text-center» + *курсив* одразу після зображення
function Blocks(blocks)
  local out = pandoc.List()
  local i = 1
  while i <= #blocks do
    local b, n = blocks[i], blocks[i + 1]
    local lone = b.t == 'Para' and #b.content == 1 and b.content[1].t == 'Image'
    if lone and n and n.t == 'Div' and has(n, 'text-center') then
      out:insert(captioned(b.content[1], n.content))
      i = i + 2
    else
      out:insert(b)
      i = i + 1
    end
  end
  -- сусідні елементи галереї — в одну галерею
  local merged, gal = pandoc.List(), nil
  for _, b in ipairs(out) do
    if b.t == 'Div' and has(b, 'gallery-item') then
      gal = gal or pandoc.List()
      gal:extend(b.content)
    else
      if gal then merged:insert(pandoc.Div(gal, pandoc.Attr('', { 'gallery' }))); gal = nil end
      merged:insert(b)
    end
  end
  if gal then merged:insert(pandoc.Div(gal, pandoc.Attr('', { 'gallery' }))) end
  local flat = pandoc.List()
  for _, b in ipairs(merged) do
    if b.t == 'Div' and has(b, 'text-center') then flat:extend(b.content) else flat:insert(b) end
  end
  return flat
end
