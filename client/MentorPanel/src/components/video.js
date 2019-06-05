import React from 'react';
import ReactPlayer from 'react-player'
import { useSelector, useDispatch } from 'react-redux';
import { Star, StarBorder } from '@material-ui/icons'

import { idleUrl, videoUrl } from '../api/api'
import { answerFinished, faveMentor } from '../redux/actions'

const FaveButton = () => {
    const dispatch = useDispatch()
    const mentor = useSelector(state => state.current_mentor)
    const fave_mentor = useSelector(state => state.faved_mentor)

    const onClick = () => {
        dispatch(faveMentor(mentor))
    }

    return (
        fave_mentor === mentor ?
            <Star className='star-icon' onClick={onClick} style={{ color: 'yellow' }} /> :
            <StarBorder className='star-icon' onClick={onClick} style={{ color: 'grey' }} />
    )
}

const Video = () => {
    const dispatch = useDispatch()
    const isIdle = useSelector(state => state.isIdle)
    const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
    const src =
        mentor ?
            isIdle ? idleUrl(mentor) : videoUrl(mentor)
            : ''

    const maxWidth = 500
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : maxWidth
    const width = Math.min(windowWidth, maxWidth)

    const onEnded = () => {
        dispatch(answerFinished())
    }

    return (
        <div id='video-container' style={{ width: width }}>
            <ReactPlayer
                url={src}
                onEnded={onEnded}
                loop={isIdle}
                width={width}
                height={width * 0.895}
                controls={!isIdle}
                playing={true}
                playsinline={true}
                webkit-playsinline='true' />
            <FaveButton />
        </div>
    )
}

export default Video
