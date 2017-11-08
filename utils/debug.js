define(function (){
    if (/debug/.test(location.query)) {
        localStorage.setItem('rt.debug', true)
    }
    return {enabled: localStorage.getItem('rt.debug')};
});
