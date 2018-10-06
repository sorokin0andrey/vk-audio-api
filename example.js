const VkAudioApi = require('./index')

VkAudioApi.init({
  userId: 'your_id_here',
  cookie: 'your_cookies',
})

VkAudioApi.getTracks()
  .then((tracks) => {
    console.log('*** Count:', tracks.length)
    VkAudioApi.getSource(tracks[0])
      .then((track) => {
        console.log('*** Last track:', `${track.author} - ${track.title}`)
        console.log('*** url:', track.src)
      })
      .catch(console.error)
  })
  .catch(console.error)
