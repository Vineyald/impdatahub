from django.shortcuts import render

def index(request):
    return render(request, 'index.html')  # index.html é seu template React
