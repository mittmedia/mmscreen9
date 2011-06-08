fs = require 'fs'
{exec} = require 'child_process'
util = require 'util'
glob = require 'glob'

src_dir = "coffee"
target_dir = "build"

task 'build', "Build project from #{src_dir}/*.coffee to #{target_dir}/*.js", ->
  exec "coffee --compile --output #{target_dir}/ #{src_dir}/", (err, stdout, stderr) ->
    #throw err if err
    if err
      util.log err
      util.log stderr
    else
      util.log "."

task 'watch', "Watch source at #{src_dir}/*.coffee and build changes", ->
  util.log "Watching for changes in: #{src_dir}"
  glob.glob "#{src_dir}/*.coffee", null, (er, matches) -> 
    for file in matches
      fs.watchFile file, (curr, prev) ->
        if +curr.mtime isnt +prev.mtime
          invoke 'build'
