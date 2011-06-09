fs = require 'fs'
{exec} = require 'child_process'
util = require 'util'
glob = require('glob').glob
spawn = require('child_process').spawn

coffee_src_dir = "coffee"
coffee_target_dir = "build"
sass_src_dir = "sass"
sass_target_dir = "build"


task 'build:coffee', "Build project from #{coffee_src_dir}/*.coffee to #{coffee_target_dir}/*.js", ->
  exec "coffee --compile --output #{coffee_target_dir}/ #{coffee_src_dir}/", (err, stdout, stderr) ->
    #throw err if err
    if err
      util.log err
      util.log stderr
    else
      util.log "."

task 'watch:coffee', "Watch source at #{coffee_src_dir}/*.coffee and build changes", ->
  util.log "Watching for changes in: #{coffee_src_dir}/"
  glob "#{coffee_src_dir}/*.coffee", null, (er, matches) -> 
    for file in matches
      fs.watchFile file, (curr, prev) ->
        if +curr.mtime isnt +prev.mtime
          invoke 'build:coffee'

task 'watch:sass', "Watch SASS source at #{sass_src_dir}/*.sass and build changes", ->
  util.log "Watching for changes in: #{sass_src_dir}/"
  proc =         spawn 'sass', ["--watch", "#{sass_src_dir}:#{sass_target_dir}"]
  #proc.stderr.on 'data', (buffer) -> console.log buffer.toString()
  #proc.stdin.on  'data', (buffer) -> console.log buffer.toString()
  #proc.on        'exit', (status) -> process.exit(1) if status != 0
  return
  
task 'watch', "Watch SASS and Coffee sources and build changes", ->
  invoke 'watch:sass'
  invoke 'watch:coffee'